# 🎵 Musify — AI-Powered Music Discovery (MERN + Clerk + Groq)

A full-stack, AI-powered music platform built with React, Express, MongoDB, Clerk auth, and Groq (Llama 3.3 70B). Stream 30-second previews from a 700+ track catalog, chat with an **AI assistant that answers with playable songs**, generate playlists from natural-language prompts, stream **full podcast episodes**, explore artist/album pages and charts, and track your listening with a stats dashboard (streaks, heatmaps, AI weekly report).

<p align="center">
  <a href="#-cloud-deployment--one-vercel-project-client--api"><b>🚀 Deploy Guide</b></a> &nbsp;•&nbsp;
  <a href="#-environment-variables"><b>Env Vars</b></a> &nbsp;•&nbsp;
  <a href="#api-endpoints"><b>API</b></a> &nbsp;•&nbsp;
  <a href="#architecture"><b>Architecture</b></a>
</p>

> **🔴 Live Demo:** **https://musify-sigma-blond.vercel.app** &nbsp;·&nbsp; one Vercel project (client + serverless API) + MongoDB Atlas — [deploy guide below](#-cloud-deployment--one-vercel-project-client--api).

**Author:** Namratha R — [@namrathar-18](https://github.com/namrathar-18)

---

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS, Zustand, React Router, Axios, lucide-react |
| Backend | Node.js + Express |
| Database | MongoDB via Mongoose |
| Auth | Clerk (`@clerk/clerk-react` + `@clerk/express`) |
| External API | iTunes Search API (free, no auth, real 30s previews) |

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
    ├── lib/itunes.js               # iTunes Search API client (search, seed, hydrate)
    ├── config/db.js                # Mongo connection
    ├── scripts/seed.js             # Seeds 600+ tracks from iTunes into Mongo
    ├── .env.example
    ├── package.json
    └── server.js                   # Entry
```

---

## Architecture

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   React Client   │  HTTPS  │   Express API    │  HTTPS  │ iTunes Search API│
│  (Vite + Clerk)  │ ───────▶│  (Clerk verify)  │ ───────▶│  (free, no auth) │
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
4. The controller upserts a local `users` row keyed by `clerkUserId`, hydrates the user's `likedSongs` from the local `tracks` cache (falling back to an iTunes `/lookup` call for any cache misses), and returns JSON.
5. `responseTime` finishes and logs `[timestamp] METHOD PATH STATUS DURATIONms` to stdout. The same value is set as the `X-Response-Time` response header.

---

## Setup

### Prerequisites

- Node.js 18+
- MongoDB running locally (or a hosted URI) — `mongodb://localhost:27017/spotify-clone` by default
- A free Clerk account → `https://clerk.com` → create app → copy publishable + secret keys
- No music-API keys needed — the catalog comes from Apple's free iTunes Search API

### 1. Server

```bash
cd server
cp .env.example .env       # fill in the real values
npm install
npm run seed               # one-time: pulls 600+ tracks from iTunes into MongoDB
npm run dev                # nodemon on http://localhost:5000
```

Required env vars (`server/.env`):

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/spotify-clone
CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
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
| POST   | `/api/users/me/recent/:trackId` | ✓ | Record a play (also logs to the durable stats store) |
| GET    | `/api/users/me/stats?days=&tz=` | ✓ | Listening stats: totals, top artists/tracks/genres, hour & day buckets, streaks |
| GET    | `/api/charts/trending` | — | Top chart songs (hydrated with previews, TTL-cached) |
| GET    | `/api/charts/top-albums` | — | Top chart albums |
| GET    | `/api/charts/new-releases` | — | Recent releases from the charts |
| GET    | `/api/charts/song-of-the-day` | — | Deterministic daily pick |
| GET    | `/api/charts/genre/:genre` | — | Genre row for the home page |
| GET    | `/api/artists/:id` | — | Artist profile + top songs + albums |
| GET    | `/api/albums/:id` | — | Album + full track list |
| GET    | `/api/podcasts/top` | — | Top podcasts (Apple RSS) |
| GET    | `/api/podcasts/search?q=` | — | Podcast search |
| GET    | `/api/podcasts/:id` | — | Show + episodes (parsed from the public RSS feed) |
| GET    | `/api/billing/plans` | — | Premium plan catalog |
| GET    | `/api/billing/status` | ✓ | Current subscription status |
| POST   | `/api/billing/checkout` | ✓ | Create a Stripe (test-mode) Checkout session |
| POST   | `/api/billing/confirm` | ✓ | Verify a completed session server-side and activate Premium |
| POST   | `/api/billing/cancel` | ✓ | Cancel at period end |
| GET    | `/api/billing/history` | ✓ | Invoice history (hosted + PDF links) |
| POST   | `/api/billing/webhook` | — | Signature-verified Stripe webhook (optional) |
| GET    | `/api/ai/status` | — | Whether AI features are configured |
| POST   | `/api/ai/chat` | ✓ | Music assistant chat → reply + playable tracks |
| POST   | `/api/ai/playlist` | ✓ | Prompt → real playlist saved to your library |
| POST   | `/api/ai/search` | ✓ | Natural-language search → tracks |
| GET    | `/api/ai/weekly-report` | ✓ | Personalized weekly listening recap |

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
| `GET /api/search?q=...` | ~180 ms | ~320 ms | Round-trip to iTunes (external API; not cached at request time) |

All cached endpoints stay well under 200ms. The only endpoint that ever exceeds it is `/api/search`, which is bounded by the iTunes API's response time.

### How the <200ms target is hit

1. **MongoDB as a write-through cache.** `npm run seed` populates the `tracks` collection with 600+ tracks once. Every subsequent `/api/songs`, `/api/songs/:id`, playlist hydrate, and liked-songs hydrate reads from Mongo, not the iTunes API. Cache misses (e.g. a search hitting a track not yet seeded) are upserted on read, so the cache grows over time.
2. **Indexes.** `spotifyId` (unique), `userId` on playlists, `clerkUserId` (unique) on users — every read path hits a covering or scanning index.
3. **Pagination.** `/api/songs` defaults to `limit=20` with a hard ceiling of 100, so the home feed never ships 500 documents in a single response.
4. **Batch hydration.** Playlist/liked cache misses are resolved with a single iTunes `/lookup?id=1,2,3` call rather than one request per track.
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

## A note on the catalog data source

The catalog is sourced from Apple's **iTunes Search API** (`https://itunes.apple.com/search`) — free, keyless, reliable from serverless/cloud IPs, and it returns a real 30-second `previewUrl` plus `trackTimeMillis` (duration) for virtually every track, so audio playback works out of the box. The seed script reports coverage:

```
Track collection size: 735
Tracks with a preview_url: 734
```

The iTunes API is rate-limited (~20 calls/min), so `scripts/seed.js` throttles between queries. If a preview ever comes back empty for a track, the Player gracefully degrades — the Play button disables with a "No 30s preview available" hint.

> Why not the Spotify Web API? Spotify now requires the app owner to hold an active **Premium** subscription to call the Web API at all, and it deprecated `preview_url` for new apps (Nov 2024) — so a fresh Spotify app returns `403` and/or `null` previews. iTunes avoids both problems. The `spotifyId` field name is kept purely for compatibility; it holds the external catalog id (an iTunes `trackId`).

---

## Scripts

| Where | Command | What it does |
|---|---|---|
| `server/` | `npm run dev` | Start the API with nodemon |
| `server/` | `npm start` | Start the API in production mode |
| `server/` | `npm run seed` | Seed 600+ tracks from iTunes into MongoDB |
| `server/` | `npm test` | Run the API/unit test suite (Vitest + Supertest + in-memory Mongo) |
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
| `GROQ_API_KEY` | ⬜ | [console.groq.com](https://console.groq.com) — enables the AI assistant, AI playlists, smart search & weekly report (free tier). Without it the app runs with AI features hidden. |
| `STRIPE_SECRET_KEY` | ⬜ | [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) (`sk_test_...`) — enables Premium subscriptions in test mode (card `4242 4242 4242 4242`). |
| `STRIPE_WEBHOOK_SECRET` | ⬜ | Optional: Stripe dashboard → Webhooks → endpoint `<your-app>/api/billing/webhook` (`whsec_...`). Payments verify server-side on return even without it. |
| `CLIENT_ORIGIN` | ✅ | Deployed frontend URL (for CORS) |
| `PORT` / `NODE_ENV` | ⬜ | Set automatically by the host |

> No music-API keys are required — catalog, charts, and podcasts come from Apple's free public APIs.

### Frontend (`client/.env`)

| Variable | Required | Description |
|----------|:--------:|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | ✅ | Same Clerk publishable key (`pk_...`) |
| `VITE_API_BASE_URL` | ✅ | API base URL — `/api` for the all-in-one Vercel deploy |

> 🔒 `.env` files are gitignored — use the `.env.example` templates and never commit real keys.

---

## 🚀 Cloud Deployment — one Vercel project (client + API)

The whole app deploys to **Vercel as a single project**: the Vite client is served as static files and the Express API runs as a serverless function under `/api`. No separate backend host, no cold-start sleep.

> How it works: [`api/index.js`](api/index.js) exports the Express app as a serverless handler, and [`vercel.json`](vercel.json) builds the client to `client/dist`, serves `/api/*` through the function, and falls back to the SPA for every other route.

### 1. Database — MongoDB Atlas
Create a free **M0** cluster, add a DB user, allow network access from `0.0.0.0/0`, and copy the connection string → `MONGODB_URI`.

### 2. Free API keys
- **Clerk:** [clerk.com](https://clerk.com) → create application → copy publishable + secret keys.
- No music-API keys needed — the catalog is seeded from the free iTunes Search API.

### 3. Seed the catalog (one-time, locally)
```bash
cd spotify-clone/server
cp .env.example .env    # set MONGODB_URI to your Atlas connection string
npm install && npm run seed   # loads 600+ tracks into Atlas from iTunes
```
The running app serves the catalog from MongoDB, so this seed is only needed once.

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
  | `GROQ_API_KEY` | (optional) enables all AI features |
  | `STRIPE_SECRET_KEY` | (optional) enables Premium subscriptions (test mode) |
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

Copyright © 2026 **Namratha R**. All Rights Reserved. See [LICENSE](../LICENSE).

