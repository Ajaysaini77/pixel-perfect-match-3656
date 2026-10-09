<<<<<<< HEAD
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
=======
# Pixel Perfect Replica

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).



Continue developing this project in the [Lovable editor](https://lovable.dev/projects/50fa3c14-949a-4239-8cc0-a2479da7007b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
>>>>>>> 1deaf3921409ac27881b563608d2b2f532af3848
