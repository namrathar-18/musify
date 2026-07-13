# 🎵 Musify — Spotify Clone (MERN + Clerk + Spotify Web API)

A full-stack music streaming clone built with React, Express, MongoDB, Clerk auth, and the Spotify Web API. Browse a catalog of 500+ tracks cached from Spotify, create playlists, like songs, and stream 30-second previews — all with a Spotify-style UI.

<p align="center">
  <a href="#-cloud-deployment--one-vercel-project-client--api"><b>🚀 Deploy Guide</b></a> &nbsp;•&nbsp;
  <a href="#-environment-variables"><b>Env Vars</b></a> &nbsp;•&nbsp;
  <a href="#api-endpoints"><b>API</b></a> &nbsp;•&nbsp;
  <a href="#architecture"><b>Architecture</b></a>
</p>

> **Live Demo:** deploy in ~10 minutes with the [step-by-step guide below](#-cloud-deployment--one-vercel-project-client--api) — one Vercel project (client + serverless API) + MongoDB Atlas. Add your URL here once live: `https://musify.vercel.app`

**Author:** Namratha R — [@namrathar-18](https://github.com/namrathar-18)

---

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS, Zustand, React Router, Axios, lucide-react |
| Backend | Node.js + Express |
| Database | MongoDB via Mongoose |
| Auth | Clerk (`@clerk/clerk-react` + `@clerk/express`) |
| External API | Spotify Web API (client-credentials flow) |

---

## Project Structure

```
spotify-clone/
├── client/                         # React + Vite app
│   ├── src/
│   │   ├── components/             # Sidebar, Player, TrackRow, SearchBar, PlaylistCard
│   │   ├── pages/                  # Home, Search, Library, Playlist, Liked (all React.lazy)
│   │   ├── store/                  # Zustand stores (usePlayerStore, useLibraryStore)
│   │   ├── lib/api.js              # Axios client with Clerk-token interceptor
│   │   ├── App.jsx                 # Router + lazy + ClerkProvider integration
│   │   └── main.jsx                # Entry
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
└── server/                         # Express API
    ├── routes/                     # Route definitions (songs, search, playlists, users)
    ├── controllers/                # Business logic
    ├── models/                     # User, Playlist, Track Mongoose schemas
    ├── middleware/                 # auth (Clerk), responseTime, error
    ├── lib/spotify.js              # Spotify Web API client with token caching
    ├── config/db.js                # Mongo connection
    ├── scripts/seed.js             # Seeds 600 tracks from Spotify into Mongo
    ├── .env.example
    ├── package.json
    └── server.js                   # Entry
```

---

## Architecture

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   React Client   │  HTTPS  │   Express API    │  HTTPS  │  Spotify Web API │
│  (Vite + Clerk)  │ ───────▶│  (Clerk verify)  │ ───────▶│  (client creds)  │
│                  │         │                  │         └──────────────────┘
│  - Zustand store │         │  - 4 route files │
│  - Lazy pages    │         │  - 4 controllers │         ┌──────────────────┐
│  - Audio element │         │  - Auth middleware│ ──────▶│     MongoDB      │
│                  │         │  - Timing middleware│       │  (3 collections) │
└──────────────────┘         └──────────────────┘         └──────────────────┘
        │                                                            │
        │  Clerk JS SDK ──── sign in/up ───▶ Clerk hosted UI         │
        │                                                            │
        └────────────────── JWT in Authorization header ─────────────┘

Collections:
  users        { clerkUserId, email, displayName, likedSongs[], recentlyPlayed[] }
  playlists    { userId, name, description, tracks[{ spotifyTrackId, addedAt }] }
  tracks       { spotifyId, title, artist, album, albumArt, previewUrl, duration, cachedAt }
```

**Request flow for a protected endpoint** (e.g. `GET /api/users/me/liked`):

1. React calls `fetchLiked()` → axios interceptor pulls a JWT from Clerk's `getToken()` and adds `Authorization: Bearer <jwt>`.
2. Express runs `responseTime` middleware (starts a high-resolution timer), then `clerkMiddleware()` which verifies the JWT and populates `req.auth.userId`.
3. The `users` router runs `requireAuth()`, which 401s if the token is missing or invalid.
4. The controller upserts a local `users` row keyed by `clerkUserId`, hydrates the user's `likedSongs` from the local `tracks` cache (falling back to a Spotify `/tracks` call for any cache misses), and returns JSON.
5. `responseTime` finishes and logs `[timestamp] METHOD PATH STATUS DURATIONms` to stdout. The same value is set as the `X-Response-Time` response header.

---

## Setup

### Prerequisites

- Node.js 18+
- MongoDB running locally (or a hosted URI) — `mongodb://localhost:27017/spotify-clone` by default
- A free Clerk account → `https://clerk.com` → create app → copy publishable + secret keys
- Spotify developer credentials → `https://developer.spotify.com/dashboard` → create app → copy client ID + secret

### 1. Server

```bash
cd server
cp .env.example .env       # fill in the real values
npm install
npm run seed               # one-time: pulls 600 tracks from Spotify into MongoDB
npm run dev                # nodemon on http://localhost:5000
```

Required env vars (`server/.env`):

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/spotify-clone
CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=xxx
CLIENT_ORIGIN=http://localhost:5173
```

You should see:

```
MongoDB connected
Server listening on http://localhost:5000
```

Verify the health check:

```bash
curl -i http://localhost:5000/api/health
# HTTP/1.1 200 OK
# X-Response-Time: 1.42ms
# {"status":"ok","timestamp":"..."}
```

### 2. Client

```bash
cd client
cp .env.example .env       # fill in VITE_CLERK_PUBLISHABLE_KEY
npm install
npm run dev                # Vite on http://localhost:5173
```

Required env vars (`client/.env`):

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_API_BASE_URL=http://localhost:5000/api
```

Open `http://localhost:5173`. Sign in via the Clerk modal, then browse, search, and play.

---

## API Endpoints

All `/api/playlists/*` and `/api/users/me/*` endpoints require `Authorization: Bearer <Clerk JWT>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET    | `/api/health` | — | Health check |
| GET    | `/api/songs?page=1&limit=20` | — | Paginated catalog (cached in Mongo) |
| GET    | `/api/songs/:id` | — | Single track; cache-miss falls back to Spotify |
| GET    | `/api/search?q=...` | — | Search tracks, artists, albums via Spotify |
| GET    | `/api/playlists` | ✓ | Current user's playlists |
| POST   | `/api/playlists` | ✓ | Create a playlist `{name, description?}` |
| GET    | `/api/playlists/:id` | ✓ | Single playlist with hydrated tracks |
| PUT    | `/api/playlists/:id` | ✓ | Rename / update description |
| DELETE | `/api/playlists/:id` | ✓ | Delete a playlist |
| POST   | `/api/playlists/:id/tracks` | ✓ | Add track `{spotifyTrackId}` |
| DELETE | `/api/playlists/:id/tracks/:trackId` | ✓ | Remove a track |
| GET    | `/api/users/me` | ✓ | Current user summary |
| GET    | `/api/users/me/liked` | ✓ | Liked songs (hydrated) |
| POST   | `/api/users/me/liked/:trackId` | ✓ | Toggle like on a track |
| GET    | `/api/users/me/recent` | ✓ | Recently played (hydrated, max 50) |
| POST   | `/api/users/me/recent/:trackId` | ✓ | Record a play |

See `docs/postman_collection.json` and `docs/curl_examples.sh` for ready-to-run examples.

---

## Performance

### Response-time middleware

Every request is timed via `process.hrtime.bigint()` (nanosecond resolution) in `server/middleware/responseTime.middleware.js`:

```
[2026-06-11T02:14:33.812Z] GET /api/songs?page=1&limit=20 200 4.21ms
[2026-06-11T02:14:34.001Z] GET /api/songs/3n3Ppam7vgaVa1iaRUc9Lp 200 2.87ms
[2026-06-11T02:14:35.244Z] GET /api/search?q=daft+punk 200 187.34ms
```

The same duration is set as the `X-Response-Time` header on each response, so you can read it from Postman, browser devtools, or `curl -i`.

### Measured numbers (local MongoDB, M2 Mac, warm cache)

| Endpoint | p50 | p95 | Notes |
|---|---|---|---|
| `GET /api/songs?page=1&limit=20` | ~5 ms | ~12 ms | Pure Mongo, indexed sort |
| `GET /api/songs/:id` (cache hit) | ~3 ms | ~8 ms | Single-document `findOne` on `spotifyId` index |
| `GET /api/users/me/liked` | ~10 ms | ~25 ms | Two Mongo queries + Clerk JWT verify |
| `GET /api/search?q=...` | ~180 ms | ~320 ms | Round-trip to Spotify (external API; not cached at request time) |

All cached endpoints stay well under 200ms. The only endpoint that ever exceeds it is `/api/search`, which is bounded by Spotify's response time.

### How the <200ms target is hit

1. **MongoDB as a write-through cache.** `npm run seed` populates the `tracks` collection with 600 tracks once. Every subsequent `/api/songs`, `/api/songs/:id`, playlist hydrate, and liked-songs hydrate reads from Mongo, not Spotify. Cache misses (e.g. a search hitting a track not yet seeded) are upserted on read, so the cache grows over time.
2. **Indexes.** `spotifyId` (unique), `userId` on playlists, `clerkUserId` (unique) on users — every read path hits a covering or scanning index.
3. **Pagination.** `/api/songs` defaults to `limit=20` with a hard ceiling of 100, so the home feed never ships 500 documents in a single response.
4. **Spotify token caching.** `lib/spotify.js` caches the client-credentials access token in memory until 30s before expiry. We never spend a request fetching a token when one is still valid.
5. **Lean reads.** Controllers use `.lean()` on Mongoose queries to skip hydration overhead and return plain objects.

### Frontend performance

- **Code splitting.** Every page (`Home`, `Search`, `Library`, `Playlist`, `Liked`) is imported via `React.lazy()` and rendered inside a `Suspense` boundary in `App.jsx`. The Vite build splits each into its own chunk:
  ```
  dist/assets/Liked-*.js      2.16 kB
  dist/assets/Home-*.js       3.38 kB
  dist/assets/Search-*.js     3.48 kB
  dist/assets/Playlist-*.js   3.59 kB
  dist/assets/Library-*.js    4.43 kB
  dist/assets/index-*.js    260.19 kB   (vendor + entry, gzip: 80.80 kB)
  ```
- **Pagination.** `Home.jsx` requests 20 tracks per page with Previous/Next controls.
- **Debounced search.** `Search.jsx` waits 300ms after the last keystroke before firing the API call.

---

## A note on Spotify `preview_url`

Spotify deprecated the `preview_url` field for newly-registered apps in November 2024. Apps registered before that date still receive 30s preview URLs; new apps get `null`.

The seed script reports how many cached tracks have a preview:

```
Track collection size: 600
Tracks with a preview_url: 0
Note: 0 tracks have preview_url...
```

If yours comes back as 0, the catalog will still render and all CRUD/auth features work, but the Player's Play button stays disabled with a "No 30s preview available" hint. To get audio playback:

- Use a Spotify app registered before Nov 2024, or
- Wire in a Deezer fallback: their `https://api.deezer.com/search` endpoint returns a 30s `preview` URL per track with no auth required. The Player already gracefully degrades when `previewUrl` is empty, so adding the fallback is a small change in `server/lib/spotify.js` `normalizeTrack`.

---

## Scripts

| Where | Command | What it does |
|---|---|---|
| `server/` | `npm run dev` | Start the API with nodemon |
| `server/` | `npm start` | Start the API in production mode |
| `server/` | `npm run seed` | Seed 600 tracks from Spotify into MongoDB |
| `client/` | `npm run dev` | Start Vite dev server |
| `client/` | `npm run build` | Build for production |
| `client/` | `npm run preview` | Preview the production build |

---

## 🔑 Environment Variables

### Backend (`server/.env`)

| Variable | Required | Where to get it |
|----------|:--------:|-----------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas → Connect → Drivers |
| `CLERK_PUBLISHABLE_KEY` | ✅ | [clerk.com](https://clerk.com) → app → API Keys (`pk_...`) |
| `CLERK_SECRET_KEY` | ✅ | Clerk → API Keys (`sk_...`) |
| `SPOTIFY_CLIENT_ID` | ✅¹ | [developer.spotify.com](https://developer.spotify.com/dashboard) → app |
| `SPOTIFY_CLIENT_SECRET` | ✅¹ | Spotify dashboard → app settings |
| `CLIENT_ORIGIN` | ✅ | Deployed frontend URL (for CORS) |
| `PORT` / `NODE_ENV` | ⬜ | Set automatically by Render |

¹ Spotify keys are only needed to **seed** the catalog (`npm run seed`). After the 500+ tracks are in MongoDB, the running app serves them from the database.

### Frontend (`client/.env`)

| Variable | Required | Description |
|----------|:--------:|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | ✅ | Same Clerk publishable key (`pk_...`) |
| `VITE_API_BASE_URL` | ✅ | Backend base URL, e.g. `https://<your-api>.onrender.com/api` |

> 🔒 `.env` files are gitignored — use the `.env.example` templates and never commit real keys.

---

## 🚀 Cloud Deployment — one Vercel project (client + API)

The whole app deploys to **Vercel as a single project**: the Vite client is served as static files and the Express API runs as a serverless function under `/api`. No separate backend host, no cold-start sleep.

> How it works: [`api/index.js`](api/index.js) exports the Express app as a serverless handler, and [`vercel.json`](vercel.json) builds the client to `client/dist`, serves `/api/*` through the function, and falls back to the SPA for every other route.

### 1. Database — MongoDB Atlas
Create a free **M0** cluster, add a DB user, allow network access from `0.0.0.0/0`, and copy the connection string → `MONGODB_URI`.

### 2. Free API keys
- **Clerk:** [clerk.com](https://clerk.com) → create application → copy publishable + secret keys.
- **Spotify:** [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) → create app → copy Client ID + Secret.

### 3. Seed the catalog (one-time, locally)
```bash
cd spotify-clone/server
cp .env.example .env    # fill MONGODB_URI + SPOTIFY_* keys (point MONGODB_URI at Atlas)
npm install && npm run seed   # loads 600 tracks into Atlas
```
The running app serves the catalog from MongoDB, so Spotify keys are only needed for this one-time seed.

### 4. Deploy to Vercel
[vercel.com](https://vercel.com) → **Add New → Project** → import this repo, then:

- **Root Directory:** `spotify-clone`  *(not `client` — the root holds `vercel.json` + the `api/` function)*
- **Framework Preset:** Other *(the included `vercel.json` drives the build)*
- **Environment Variables:**

  | Key | Value |
  |-----|-------|
  | `MONGODB_URI` | your Atlas connection string |
  | `CLERK_PUBLISHABLE_KEY` | `pk_live_...` (or `pk_test_...`) |
  | `CLERK_SECRET_KEY` | `sk_live_...` (or `sk_test_...`) |
  | `VITE_CLERK_PUBLISHABLE_KEY` | same publishable key as above |
  | `VITE_API_BASE_URL` | `/api` |
  | `CLIENT_ORIGIN` | your Vercel URL, e.g. `https://musify.vercel.app` |

  Spotify keys are **not** required in Vercel (seeding already happened in step 3).

Click **Deploy**. When it's live, open the URL, then in **Clerk → Domains** add your Vercel URL so sign-in works in production.

### 5. Verify
```bash
curl -i https://<your-app>.vercel.app/api/health      # → 200 {"status":"ok",...}
curl    https://<your-app>.vercel.app/api/songs?limit=5   # → 5 seeded tracks
```
Then sign in on the site and confirm liking a song, creating a playlist, and search all work.

<details>
<summary>Alternative: split hosting (Vercel client + Render API)</summary>

This repo also includes [`render.yaml`](../render.yaml) if you prefer a dedicated backend. Deploy the API on [render.com](https://render.com) (**New → Blueprint**, or a Web Service with root `spotify-clone/server`, build `npm install`, start `npm start`), deploy `spotify-clone/client` as a separate Vercel project with `VITE_API_BASE_URL = https://<your-render-url>/api`, and set the API's `CLIENT_ORIGIN` to the Vercel URL. Note: Render's free tier sleeps after 15 min (~50s cold start).
</details>

---

## License

MIT

