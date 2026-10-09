# Padosi — Full-stack hyperlocal discovery demo

Stack:
- Frontend: Next.js App Router, JavaScript, Tailwind CSS, lucide-react, Leaflet
- Backend: FastAPI (Python)
- Data: mock data in `backend/data.py` (no database required for this demo)

## Run locally

### 1) Start FastAPI
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
API docs: http://127.0.0.1:8000/docs

### 2) Start Next.js in another terminal
```bash
cd frontend
npm install
# Copy .env.example to .env.local (or create it)
npm run dev
```
Open http://localhost:3000

The frontend uses `NEXT_PUBLIC_API_URL` and defaults to `http://127.0.0.1:8000`.
If testing on a phone or another device, set it to your computer's LAN IP and allow the ports through your firewall.

## Notes
- This is a clickable demo using mock data, not a production marketplace.
- The "verification upload" screen is UI-only; it does not upload identity documents.
- Booking/request actions are demo interactions and are not persisted.
- Map tiles come from OpenStreetMap. Use a proper tile provider and follow its usage policy before production.
