import os
import csv

from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from sqlalchemy.engine import make_url


load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
db_url = make_url(DATABASE_URL)

if db_url.drivername != "postgresql+psycopg":
    raise RuntimeError(
        "Expected a PostgreSQL DATABASE_URL using psycopg."
    )

CSV_PATH = Path(__file__).parent / "city_facilities_available_dates.csv"


def clean(value):
    if value is None:
        return None

    value = value.strip()

    if not value or value.lower() in {"nan", "null", "none"}:
        return None

    return value


def parse_number(value):
    value = clean(value)

    if value is None:
        return None

    try:
        return float(value)
    except ValueError:
        return None


def parse_dates(value):
    value = clean(value)

    if value is None:
        return []

    dates = []

    for item in value.split(";"):
        item = clean(item)

        if item:
            dates.append(date.fromisoformat(item))

    return dates


connection_kwargs = {
    "host": db_url.host,
    "port": db_url.port or 5432,
    "dbname": db_url.database,
    "user": db_url.username,
    "password": db_url.password,
}

if db_url.query:
    connection_kwargs["options"] = None


insert_sql = """
INSERT INTO facilities (
    facility_id,
    res_type,
    category,
    city_name,
    state_province,
    country,
    address_line,
    postal_code,
    latitude,
    longitude,
    phone_number,
    email,
    website,
    operating_hours,
    year_built,
    available_dates
)
VALUES (
    %(facility_id)s,
    %(res_type)s,
    %(category)s,
    %(city_name)s,
    %(state_province)s,
    %(country)s,
    %(address_line)s,
    %(postal_code)s,
    %(latitude)s,
    %(longitude)s,
    %(phone_number)s,
    %(email)s,
    %(website)s,
    %(operating_hours)s,
    %(year_built)s,
    %(available_dates)s
)
ON CONFLICT (facility_id)
DO UPDATE SET
    res_type = EXCLUDED.res_type,
    category = EXCLUDED.category,
    city_name = EXCLUDED.city_name,
    state_province = EXCLUDED.state_province,
    country = EXCLUDED.country,
    address_line = EXCLUDED.address_line,
    postal_code = EXCLUDED.postal_code,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    website = EXCLUDED.website,
    operating_hours = EXCLUDED.operating_hours,
    year_built = EXCLUDED.year_built,
    available_dates = EXCLUDED.available_dates;
"""


def main():
    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"CSV file not found: {CSV_PATH}\n"
            "Place the CSV in the backend directory."
        )

    imported = 0

    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        with psycopg.connect(**connection_kwargs) as connection:
            with connection.cursor() as cursor:
                for row in reader:
                    facility_id = clean(row.get("Facility_ID"))

                    if not facility_id:
                        continue

                    params = {
                        "facility_id": facility_id,
                        "res_type": clean(row.get("res_type")),
                        "category": clean(row.get("category")),
                        "city_name": clean(row.get("City_Name")),
                        "state_province": clean(
                            row.get("State_Province")
                        ),
                        "country": clean(row.get("Country")),
                        "address_line": clean(row.get("Address_Line")),
                        "postal_code": clean(row.get("Postal_Code")),
                        "latitude": parse_number(row.get("Latitude")),
                        "longitude": parse_number(row.get("Longitude")),
                        "phone_number": clean(row.get("Phone_Number")),
                        "email": clean(row.get("Email")),
                        "website": clean(row.get("Website")),
                        "operating_hours": clean(
                            row.get("Operating_Hours")
                        ),
                        "year_built": (
                            int(float(row["Year_Built"]))
                            if clean(row.get("Year_Built"))
                            else None
                        ),
                        "available_dates": parse_dates(
                            row.get("Available_dates")
                        ),
                    }

                    cursor.execute(insert_sql, params)
                    imported += 1

    print(f"Successfully imported/updated {imported} facilities.")


if __name__ == "__main__":
    main()