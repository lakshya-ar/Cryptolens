# Deploying CryptoLens (Render, free tier)

The whole stack deploys to Render from a single [`render.yaml`](render.yaml)
Blueprint — no other host required.

| Service | Type | Notes |
|---|---|---|
| `cryptolens-db` | PostgreSQL (free) | Stores the `klines_1m` table. |
| `cryptolens-backend` | Web service (free) | FastAPI REST API **and** the `/ws` live-order-book WebSocket, one process. |
| `cryptolens-frontend` | Static site (free) | React + Vite SPA. |

The code must be on GitHub first (this repo).

---

## Deploy

1. Render Dashboard → **New → Blueprint**.
2. Connect this GitHub repo and select the branch.
3. Render reads `render.yaml` and lists the database + two services, all on the
   **free** plan. Click **Apply**.
4. First backend build installs deps and ingests a starter dataset
   (Jan–Mar 2024, all 5 assets) into Postgres. This makes the initial build take
   a few extra minutes.
5. When the services are live, open the **frontend** URL, e.g.
   `https://cryptolens-frontend.onrender.com`.

The frontend is wired to the backend automatically: `render.yaml` injects the
backend host into the frontend's `VITE_API_BASE` / `VITE_WS_URL` at build time,
and `DATABASE_URL` is injected into the backend from the managed database.

Sanity-check the API: open `https://cryptolens-backend.onrender.com/api/health`
→ `{"status":"ok"}`.

---

## Notes

- **Free-tier sleep:** free web services spin down after ~15 min idle; the first
  request afterwards cold-starts (~50 s). The static frontend is always on.
- **Free Postgres lifespan:** Render's free PostgreSQL is time-limited — back up
  or upgrade before it expires if you need the data long-term.
- **Loading more history:** edit the `--start` / `--end` months in the backend
  `buildCommand` in `render.yaml`, then redeploy (longer builds, more storage).
- **Lock down CORS:** set `CORS_ORIGINS=https://cryptolens-frontend.onrender.com`
  on the backend service once you know the frontend URL.
- **Local dev** is unchanged — leave the `VITE_*` vars unset and run the backend
  (`uvicorn app.main:app --reload --port 8000`) plus `npm run dev`; the frontend
  falls back to the Vite proxy (`/api`) and `ws://localhost:8000/ws`.
