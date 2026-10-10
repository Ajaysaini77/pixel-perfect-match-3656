import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing in .env")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def init_db():
    from models import Listing, Review, User, VendorProfile  # noqa: F401

    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "username" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(24)"))

    inspector = inspect(engine)
    username_has_unique_constraint = any(
        constraint.get("column_names") == ["username"]
        for constraint in inspector.get_unique_constraints("users")
    )
    username_has_unique_index = any(
        index.get("unique")
        and index.get("column_names") == ["username"]
        for index in inspector.get_indexes("users")
    )
    if not username_has_unique_constraint and not username_has_unique_index:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS "
                    "ix_users_username_unique ON users (username)"
                )
            )

    if "role" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'member'")
            )

    columns = {column["name"] for column in inspect(engine).get_columns("users")}
    if "display_name" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN display_name VARCHAR(60)"))

    listing_columns = {column["name"] for column in inspect(engine).get_columns("listings")}
    if "city" not in listing_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE listings ADD COLUMN city VARCHAR(80) NOT NULL DEFAULT 'Meerut'")
            )