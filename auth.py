"""
Padosi authentication:
Email + password, followed by a six-digit OTP sent over SMTP.

User accounts are persisted in the configured SQL database. OTPs remain
short-lived, process-local state.
"""

import hashlib
import hmac
import logging
import os
import secrets
import smtplib
import ssl
import time
from math import ceil
from email.message import EmailMessage

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    HTTPException,
    Response,
)
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from database import get_db
from models import User


load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = os.environ["JWT_SECRET"]

COOKIE = "padosi_session"

OTP_TTL = 300
OTP_TRIES = 5
RESEND_GAP = 30
SESSION_TTL = 7 * 24 * 3600

OTPS: dict[str, dict] = {}
logger = logging.getLogger(__name__)

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


def send_mail(to: str, subject: str, body: str) -> bool:
    """Send an email using configured SMTP credentials."""

    host = os.getenv("SMTP_HOST")

    # Development fallback: print email instead of sending it.
    if not host:
        print(f"[DEV MAIL] to={to} subject={subject}\n{body}")
        return False

    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASS", "").replace(" ", "")
    if not smtp_user or not smtp_password:
        raise HTTPException(
            status_code=503,
            detail="Email delivery is not configured. Set SMTP_USER and SMTP_PASS in the backend environment.",
        )

    message = EmailMessage()
    message["From"] = os.getenv("SMTP_FROM") or smtp_user
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    try:
        port = int(os.getenv("SMTP_PORT", "587"))
        if port == 465:
            with smtplib.SMTP_SSL(
                host,
                port,
                timeout=15,
                context=ssl.create_default_context(),
            ) as server:
                server.login(smtp_user, smtp_password)
                server.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                server.login(smtp_user, smtp_password)
                server.send_message(message)
    except smtplib.SMTPAuthenticationError as exc:
        logger.error("SMTP authentication was rejected by %s", host)
        raise HTTPException(
            status_code=503,
            detail="Email delivery failed because the SMTP server rejected the credentials. Check SMTP_USER and SMTP_PASS; Gmail requires an active App Password.",
        ) from exc
    except (smtplib.SMTPException, OSError, ValueError) as exc:
        logger.error("SMTP delivery failed through %s (%s)", host, type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="Could not send the verification email. Check SMTP_HOST, SMTP_PORT, TLS settings, and network access.",
        ) from exc

    return True


def mac(email: str, otp: str) -> str:
    """Create an HMAC of the email and OTP."""

    return hmac.new(
        JWT_SECRET.encode(),
        f"{email}:{otp}".encode(),
        hashlib.sha256,
    ).hexdigest()


def issue_otp(email: str) -> tuple[bool, int, bool]:
    """Deliver an OTP and store it only after delivery succeeds."""

    now = time.time()
    old = OTPS.get(email)

    # Keep the existing OTP during the resend cooldown.
    if old and now - old["sent"] < RESEND_GAP:
        return False, ceil(RESEND_GAP - (now - old["sent"])), True

    otp = f"{secrets.randbelow(10**6):06d}"

    email_sent = send_mail(
        email,
        "Your Padosi verification code",
        (
            f"Your Padosi verification code is {otp}.\n"
            "It expires in 5 minutes.\n"
            "If this wasn't you, ignore this email."
        ),
    )
    OTPS[email] = {
        "h": mac(email, otp),
        "exp": now + OTP_TTL,
        "tries": 0,
        "sent": now,
    }
    return email_sent, RESEND_GAP, False


def otp_response(email: str) -> dict[str, bool | int]:
    email_sent, resend_after, cooldown = issue_otp(email)
    return {
        "otp_required": True,
        "email_sent": email_sent,
        "resend_after": resend_after,
        "cooldown": cooldown,
    }


@router.post("/register")
def register(
    c: Creds,
    db: Session = Depends(get_db),
):
    email = norm(str(c.email))
    user = db.query(User).filter(User.email == email).first()

    if user and user.is_verified:
        raise HTTPException(
            status_code=409,
            detail="This email already has a verified account. Please sign in instead.",
        )

    password_hash = bcrypt.hashpw(
        c.password.encode(),
        bcrypt.gensalt(),
    ).decode("utf-8")

    if user:
        user.hashed_password = password_hash
    else:
        user = User(
            email=email,
            hashed_password=password_hash,
            is_verified=False,
        )
        db.add(user)

    db.commit()
    return otp_response(email)



@router.post("/login")
def login(
    c: Creds,
    db: Session = Depends(get_db),
):
    email = norm(str(c.email))
    user = db.query(User).filter(User.email == email).first()

    password_hash = user.hashed_password.encode() if user else DUMMY
    password_ok = bcrypt.checkpw(
        c.password.encode(),
        password_hash,
    )

    if not user or not password_ok or not user.is_verified:
        raise HTTPException(
            status_code=401,
            detail="Wrong email or password.",
        )

    return otp_response(email)


@router.post("/resend-otp")
def resend(
    e: EmailOnly,
    db: Session = Depends(get_db),
):
    email = norm(str(e.email))
    user = db.query(User).filter(User.email == email).first()

    if user:
        return otp_response(email)

    return {"otp_required": True}


@router.post("/verify-otp")
def verify(
    v: Verify,
    res: Response,
    db: Session = Depends(get_db),
):
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

    user = db.query(User).filter(User.email == email).first()

    if not user:
        OTPS.pop(email, None)
        raise HTTPException(
            status_code=400,
            detail="Account not found. Please register again.",
        )

    OTPS.pop(email, None)
    user.is_verified = True
    db.commit()
    db.refresh(user)

    token = jwt.encode(
        {
            "sub": str(user.id),
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

    return {"id": user.id, "email": user.email}


def current_user(
    token: str | None = Cookie(default=None, alias=COOKIE),
    db: Session = Depends(get_db),
) -> User:
    try:
        if not token:
            raise ValueError("Missing token")

        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Not signed in.",
        ) from None

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Not signed in.",
        )

    return user


@router.get("/me")
def me(user: User = Depends(current_user)):
    return {"id": user.id, "email": user.email}


@router.post("/logout")
def logout(res: Response):
    res.delete_cookie(COOKIE, path="/")
    return {"ok": True}
