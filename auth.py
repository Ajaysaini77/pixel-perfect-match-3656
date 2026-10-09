"""
Padosi authentication:
Email + password, followed by a six-digit OTP sent over SMTP.

Development storage is in memory.
Replace USERS and OTPS with persistent storage before production.
"""

import hashlib
import hmac
import os
import secrets
import smtplib
import time

from email.message import EmailMessage

import bcrypt
import jwt

from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Cookie,
    Depends,
    HTTPException,
    Response,
)
from pydantic import BaseModel, EmailStr, Field


# Load environment variables from backend/.env
load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = os.environ["JWT_SECRET"]

COOKIE = "padosi_session"

OTP_TTL = 300
OTP_TRIES = 5
RESEND_GAP = 30
SESSION_TTL = 7 * 24 * 3600

# Development-only storage
USERS: dict[str, dict] = {}
OTPS: dict[str, dict] = {}

# Used to reduce timing differences for unknown users.
DUMMY = bcrypt.hashpw(
    b"dummy-password",
    bcrypt.gensalt(),
)


class Creds(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class Verify(BaseModel):
    email: EmailStr
    otp: str = Field(pattern=r"^\d{6}$")


class EmailOnly(BaseModel):
    email: EmailStr


def norm(email: str) -> str:
    return email.strip().lower()


def send_mail(to: str, subject: str, body: str) -> None:
    """Send an email using configured SMTP credentials."""

    host = os.getenv("SMTP_HOST")

    # Development fallback: print email instead of sending it.
    if not host:
        print(f"[DEV MAIL] to={to} subject={subject}\n{body}")
        return

    smtp_user = os.environ["SMTP_USER"]
    smtp_password = os.environ["SMTP_PASS"]

    message = EmailMessage()
    message["From"] = os.getenv("SMTP_FROM") or smtp_user
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(
        host,
        int(os.getenv("SMTP_PORT", "587")),
        timeout=15,
    ) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_user, smtp_password)
        server.send_message(message)


def mac(email: str, otp: str) -> str:
    """Create an HMAC of the email and OTP."""

    return hmac.new(
        JWT_SECRET.encode(),
        f"{email}:{otp}".encode(),
        hashlib.sha256,
    ).hexdigest()


def issue_otp(email: str, bg: BackgroundTasks) -> None:
    """Create an OTP and schedule its delivery."""

    now = time.time()
    old = OTPS.get(email)

    # Keep the existing OTP during the resend cooldown.
    if old and now - old["sent"] < RESEND_GAP:
        return

    otp = f"{secrets.randbelow(10**6):06d}"

    OTPS[email] = {
        "h": mac(email, otp),
        "exp": now + OTP_TTL,
        "tries": 0,
        "sent": now,
    }

    bg.add_task(
        send_mail,
        email,
        "Your Padosi verification code",
        (
            f"Your Padosi verification code is {otp}.\n"
            "It expires in 5 minutes.\n"
            "If this wasn't you, ignore this email."
        ),
    )


@router.post("/register")
def register(c: Creds, bg: BackgroundTasks):
    email = norm(str(c.email))
    user = USERS.get(email)

    if user and user["verified"]:
        bg.add_task(
            send_mail,
            email,
            "Padosi account",
            "You already have a Padosi account. Please sign in instead.",
        )
    else:
        USERS[email] = {
            "pw": bcrypt.hashpw(
                c.password.encode(),
                bcrypt.gensalt(),
            ),
            "verified": False,
        }

        issue_otp(email, bg)

    return {"otp_required": True}


@router.post("/login")
def login(c: Creds, bg: BackgroundTasks):
    email = norm(str(c.email))
    user = USERS.get(email)

    password_hash = user["pw"] if user else DUMMY

    password_ok = bcrypt.checkpw(
        c.password.encode(),
        password_hash,
    )

    if not user or not password_ok or not user["verified"]:
        raise HTTPException(
            status_code=401,
            detail="Wrong email or password.",
        )

    issue_otp(email, bg)

    return {"otp_required": True}


@router.post("/resend-otp")
def resend(e: EmailOnly, bg: BackgroundTasks):
    email = norm(str(e.email))

    if email in USERS:
        issue_otp(email, bg)

    return {"otp_required": True}


@router.post("/verify-otp")
def verify(v: Verify, res: Response):
    email = norm(str(v.email))
    record = OTPS.get(email)

    if (
        not record
        or record["exp"] < time.time()
        or record["tries"] >= OTP_TRIES
    ):
        OTPS.pop(email, None)

        raise HTTPException(
            status_code=400,
            detail="That code expired. Ask for a new one.",
        )

    record["tries"] += 1

    if not hmac.compare_digest(
        record["h"],
        mac(email, v.otp),
    ):
        raise HTTPException(
            status_code=400,
            detail="That code is wrong.",
        )

    OTPS.pop(email, None)

    user = USERS.get(email)

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Account not found. Please register again.",
        )

    user["verified"] = True

    token = jwt.encode(
        {
            "sub": email,
            "exp": int(time.time()) + SESSION_TTL,
        },
        JWT_SECRET,
        algorithm="HS256",
    )

    res.set_cookie(
        COOKIE,
        token,
        httponly=True,
        samesite="lax",
        secure=os.getenv("COOKIE_SECURE") == "1",
        max_age=SESSION_TTL,
        path="/",
    )

    return {"email": email}


def current_user(
    token: str | None = Cookie(default=None, alias=COOKIE),
) -> str:
    try:
        if not token:
            raise ValueError("Missing token")

        return jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
        )["sub"]

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Not signed in.",
        )


@router.get("/me")
def me(email: str = Depends(current_user)):
    return {"email": email}


@router.post("/logout")
def logout(res: Response):
    res.delete_cookie(COOKIE, path="/")
    return {"ok": True}