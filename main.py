from contextlib import asynccontextmanager
from typing import Literal, Optional
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from data import LISTINGS
from auth import current_user, router as auth_router
from database import get_db, init_db
from models import Listing, Review, User, VendorProfile


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Nearhood API",
    version="0.1.0",
    description="API for hyperlocal discovery, saved listings, and vendor inventory.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)

class ListingCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    type: Literal["resource", "vendor"]
    category: str = Field(min_length=2, max_length=80)
    city: str = Field(min_length=2, max_length=80)
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=800)
    price: str = Field(min_length=1, max_length=80)
    quantity: int = Field(default=1, ge=0, le=100000)
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)


class VendorProfilePayload(BaseModel):
    business_name: str = Field(min_length=2, max_length=80)
    category: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=800)
    city: str = Field(min_length=2, max_length=80)


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str = Field(min_length=3, max_length=800)


def serialize_listing(
    listing: Listing,
    business_name: Optional[str] = None,
    city: Optional[str] = None,
    reviews: Optional[list[dict]] = None,
) -> dict:
    review_items = reviews or []
    return {
        "id": f"saved-{listing.id}",
        "ownerId": listing.owner_id,
        "name": business_name or listing.name,
        "type": listing.type,
        "category": listing.category,
        "city": city or listing.city,
        "title": listing.title,
        "description": listing.description,
        "price": listing.price,
        "quantity": listing.quantity,
        "distanceKm": None,
        "rating": round(sum(review["rating"] for review in review_items) / len(review_items), 1) if review_items else None,
        "reviewCount": len(review_items),
        "image": listing.image,
        "lat": listing.latitude,
        "lng": listing.longitude,
        "reviews": review_items,
    }


def serialize_vendor_profile(profile: VendorProfile) -> dict:
    return {
        "id": f"vendor-{profile.id}",
        "ownerId": profile.user_id,
        "name": profile.business_name,
        "type": "vendor",
        "category": profile.category,
        "city": profile.city,
        "title": "Local vendor profile",
        "description": profile.description or f"{profile.business_name} offers {profile.category.lower()} in {profile.city}.",
        "price": "Contact for details",
        "quantity": 0,
        "distanceKm": None,
        "rating": None,
        "reviewCount": 0,
        "image": None,
        "lat": None,
        "lng": None,
        "reviews": [],
    }


def require_vendor(user: User) -> None:
    if user.role != "vendor":
        raise HTTPException(status_code=403, detail="This feature is available to vendor accounts.")


def serialize_reviews(db: Session, listing_id: int) -> list[dict]:
    rows = (
        db.query(Review, User.username, User.display_name)
        .join(User, Review.reviewer_id == User.id)
        .filter(Review.listing_id == listing_id)
        .order_by(Review.created_at.desc(), Review.id.desc())
        .all()
    )
    return [
        {
            "reviewerId": review.reviewer_id,
            "name": display_name or (f"@{username}" if username else "Neighbour"),
            "rating": review.rating,
            "text": review.text,
        }
        for review, username, display_name in rows
    ]


def serialize_saved_listing(
    db: Session,
    listing: Listing,
    business_name: Optional[str] = None,
    city: Optional[str] = None,
) -> dict:
    return serialize_listing(
        listing,
        business_name,
        city,
        serialize_reviews(db, listing.id),
    )


SAMPLE_LISTING_IDS = {"resource-3d-01", "resource-drill-02", "vendor-chai-01"}


def serialize_sample_listing(item: dict) -> dict:
    return {
        "id": item["id"],
        "name": item["name"],
        "type": item["type"],
        "category": item["category"],
        "city": "Meerut",
        "title": item["title"],
        "description": item["description"],
        "price": item["price"],
        "quantity": 1,
        "distanceKm": item["distanceKm"],
        "rating": None,
        "reviewCount": 0,
        "image": item["image"],
        "lat": item["lat"],
        "lng": item["lng"],
        "reviews": [],
        "isSample": True,
    }


SAMPLE_LISTINGS = [
    serialize_sample_listing(item)
    for item in LISTINGS
    if item["id"] in SAMPLE_LISTING_IDS
]


@app.get("/")
def root():
    return {"message": "Nearhood API is running", "docs": "/docs"}

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/listings")
def get_listings(
    type: Optional[str] = Query(default=None, pattern="^(resource|vendor)$"),
    q: Optional[str] = None,
    radius: Optional[float] = Query(default=None, ge=0.1, le=50),
    db: Session = Depends(get_db),
):
    saved_rows = (
        db.query(Listing, VendorProfile.business_name, VendorProfile.city)
        .outerjoin(VendorProfile, Listing.vendor_id == VendorProfile.id)
        .all()
    )
    vendor_profiles = db.query(VendorProfile).order_by(VendorProfile.created_at.desc()).all()
    items = [
        *SAMPLE_LISTINGS,
        *(serialize_vendor_profile(profile) for profile in vendor_profiles),
        *(serialize_saved_listing(db, row, business_name, city) for row, business_name, city in saved_rows),
    ]
    if type:
        items = [x for x in items if x["type"] == type]
    if q:
        needle = q.casefold()
        items = [x for x in items if needle in " ".join([x["name"], x["category"], x["title"], x["description"]]).casefold()]
    if radius is not None:
        items = [x for x in items if x.get("distanceKm") is None or x["distanceKm"] <= radius]
    return {"items": items, "count": len(items)}

@app.get("/api/listings/{listing_id}")
def get_listing(listing_id: str, db: Session = Depends(get_db)):
    sample = next((item for item in SAMPLE_LISTINGS if item["id"] == listing_id), None)
    if sample:
        return sample
    if listing_id.startswith("saved-") and listing_id[6:].isdigit():
        row = db.query(Listing).filter(Listing.id == int(listing_id[6:])).first()
        if row:
            profile = db.query(VendorProfile).filter(VendorProfile.id == row.vendor_id).first() if row.vendor_id else None
            return serialize_saved_listing(
                db,
                row,
                profile.business_name if profile else None,
                profile.city if profile else None,
            )
    if listing_id.startswith("vendor-") and listing_id[7:].isdigit():
        profile = db.query(VendorProfile).filter(VendorProfile.id == int(listing_id[7:])).first()
        if profile:
            return serialize_vendor_profile(profile)
    raise HTTPException(status_code=404, detail="Listing not found")


@app.post("/api/listings/{listing_id}/reviews", status_code=201)
def create_review(
    listing_id: str,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not listing_id.startswith("saved-") or not listing_id[6:].isdigit():
        raise HTTPException(status_code=404, detail="Only published listings can be reviewed.")
    listing = db.query(Listing).filter(Listing.id == int(listing_id[6:])).first()
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.owner_id == user.id:
        raise HTTPException(status_code=403, detail="You cannot review your own listing.")
    if db.query(Review).filter(
        Review.listing_id == listing.id,
        Review.reviewer_id == user.id,
    ).first():
        raise HTTPException(status_code=409, detail="You have already reviewed this listing.")
    review_text = payload.text.strip()
    if len(review_text) < 3:
        raise HTTPException(status_code=422, detail="A review must contain at least 3 non-space characters.")

    review = Review(
        listing_id=listing.id,
        reviewer_id=user.id,
        rating=payload.rating,
        text=review_text,
    )
    db.add(review)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="You have already reviewed this listing.") from exc
    profile = db.query(VendorProfile).filter(VendorProfile.id == listing.vendor_id).first() if listing.vendor_id else None
    return {
        "message": "Review saved.",
        "item": serialize_saved_listing(
            db,
            listing,
            profile.business_name if profile else None,
            profile.city if profile else None,
        ),
    }

@app.post("/api/listings", status_code=201)
def create_listing(
    payload: ListingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if (payload.lat is None) != (payload.lng is None):
        raise HTTPException(status_code=422, detail="Latitude and longitude must be provided together.")

    vendor_profile = None
    if payload.type == "vendor":
        require_vendor(user)
        vendor_profile = db.query(VendorProfile).filter(VendorProfile.user_id == user.id).first()
        if not vendor_profile:
            raise HTTPException(status_code=409, detail="Complete your vendor profile before adding inventory.")
        if payload.category != vendor_profile.category:
            raise HTTPException(status_code=409, detail="Vendor inventory must use the category selected in your profile.")

    row = Listing(
        owner_id=user.id,
        vendor_id=vendor_profile.id if vendor_profile else None,
        type=payload.type,
        name=vendor_profile.business_name if vendor_profile else (
            user.display_name or (f"@{user.username}" if user.username else "Neighbour")
        ),
        category=payload.category,
        city=vendor_profile.city if vendor_profile else payload.city,
        title=payload.title,
        description=payload.description,
        price=payload.price,
        quantity=payload.quantity,
        latitude=payload.lat,
        longitude=payload.lng,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "message": "Listing saved.",
        "item": serialize_listing(
            row,
            vendor_profile.business_name if vendor_profile else None,
            vendor_profile.city if vendor_profile else None,
        ),
    }


@app.get("/api/vendor/dashboard")
def get_vendor_dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    require_vendor(user)
    profile = db.query(VendorProfile).filter(VendorProfile.user_id == user.id).first()
    items = (
        db.query(Listing)
        .filter(Listing.owner_id == user.id, Listing.type == "vendor")
        .order_by(Listing.created_at.desc(), Listing.id.desc())
        .all()
    )
    return {
        "profile": None if not profile else {
            "business_name": profile.business_name,
            "category": profile.category,
            "description": profile.description,
            "city": profile.city,
        },
        "items": [
            serialize_saved_listing(
                db,
                item,
                profile.business_name if profile else None,
                profile.city if profile else None,
            )
            for item in items
        ],
    }


@app.put("/api/vendor/profile")
def save_vendor_profile(
    payload: VendorProfilePayload,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    require_vendor(user)
    profile = db.query(VendorProfile).filter(VendorProfile.user_id == user.id).first()
    if profile is None:
        profile = VendorProfile(user_id=user.id, **payload.model_dump())
        db.add(profile)
    else:
        category_changed = profile.category != payload.category
        for key, value in payload.model_dump().items():
            setattr(profile, key, value)
        if category_changed:
            db.query(Listing).filter(
                Listing.vendor_id == profile.id,
                Listing.type == "vendor",
            ).update({Listing.category: payload.category}, synchronize_session=False)
    db.commit()
    db.refresh(profile)
    return {
        "business_name": profile.business_name,
        "category": profile.category,
        "description": profile.description,
        "city": profile.city,
    }


@app.delete("/api/vendor/items/{item_id}", status_code=204)
def delete_vendor_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    require_vendor(user)
    item = db.query(Listing).filter(
        Listing.id == item_id,
        Listing.owner_id == user.id,
        Listing.type == "vendor",
    ).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Inventory item not found.")
    db.delete(item)
    db.commit()
