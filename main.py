from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from data import LISTINGS
from auth import router as auth_router



app = FastAPI(title="Padosi API", version="0.1.0", description="Mock-data API for the Padosi hyperlocal discovery demo.")

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
    type: str
    category: str
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=800)
    price: str = Field(min_length=1, max_length=80)

@app.get("/")
def root():
    return {"message": "Padosi API is running", "docs": "/docs"}

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/listings")
def get_listings(
    type: Optional[str] = Query(default=None, pattern="^(resource|vendor)$"),
    q: Optional[str] = None,
    radius: Optional[float] = Query(default=None, ge=0.1, le=50),
):
    items = LISTINGS
    if type:
        items = [x for x in items if x["type"] == type]
    if q:
        needle = q.casefold()
        items = [x for x in items if needle in " ".join([x["name"], x["category"], x["title"], x["description"]]).casefold()]
    if radius is not None:
        items = [x for x in items if x["distanceKm"] <= radius]
    return {"items": items, "count": len(items)}

@app.get("/api/listings/{listing_id}")
def get_listing(listing_id: str):
    for item in LISTINGS:
        if item["id"] == listing_id:
            return item
    raise HTTPException(status_code=404, detail="Listing not found")

@app.post("/api/listings", status_code=201)
def create_listing(payload: ListingCreate):
    # Demo-only: does not persist data or accept actual identity documents/photos.
    item = payload.model_dump()
    item.update({
        "id": f"demo-{len(LISTINGS)+1}",
        "distanceKm": 0.5,
        "trustScore": 50,
        "rating": 0,
        "reviewCount": 0,
        "verified": False,
        "live": payload.type == "vendor",
        "image": "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80",
        "lat": 28.9845,
        "lng": 77.7064,
        "reviews": [],
        "trustBreakdown": {"idVerified": 0, "completedBookings": 0, "repeatCustomers": 0},
    })
    return {"message": "Demo listing accepted (not persisted)", "item": item}
