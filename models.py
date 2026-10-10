from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String(24), unique=True, nullable=True)
    display_name = Column(String(60), nullable=True)
    role = Column(String(16), nullable=False, default="member")

    # This column must match your existing database schema.
    hashed_password = Column(String, nullable=False)

    is_verified = Column(Boolean, default=False, nullable=False)


class VendorProfile(Base):
    __tablename__ = "vendor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    business_name = Column(String(80), nullable=False)
    category = Column(String(80), nullable=False, index=True)
    description = Column(Text, nullable=False, default="")
    city = Column(String(80), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendor_profiles.id", ondelete="CASCADE"), nullable=True, index=True)
    type = Column(String(16), nullable=False, index=True)
    name = Column(String(80), nullable=False)
    category = Column(String(80), nullable=False, index=True)
    city = Column(String(80), nullable=False, default="Meerut")
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=False)
    price = Column(String(80), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    image = Column(String(500), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("listing_id", "reviewer_id", name="uq_review_listing_reviewer"),)

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)