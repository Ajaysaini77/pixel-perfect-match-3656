from sqlalchemy import Boolean, Column, Integer, String

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)

    # This column must match your existing database schema.
    hashed_password = Column(String, nullable=False)

    is_verified = Column(Boolean, default=False, nullable=False)