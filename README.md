# 🎵 Musify — Full-Stack Music Streaming App

An **AI-powered music discovery platform** on the MERN stack: a 700+ track catalog with real 30-second previews, an **AI assistant that answers with playable songs**, **prompt-to-playlist generation**, natural-language search, **full-length podcast streaming**, and a personal **listening-stats dashboard** with heatmaps and streaks — behind a fast, responsive, custom-designed UI with **Clerk (Google) authentication**.

**Author:** Namratha R — [@namrathar-18](https://github.com/namrathar-18)

---

## ✨ Highlights

- **AI music assistant** (Groq · Llama 3.3 70B): multi-turn chat that recommends real, instantly playable tracks
- **AI playlist generator** — describe a vibe, get a real playlist saved to your library
- **AI natural-language search** ("energetic gym songs like Eye of the Tiger") + AI weekly listening report
- **Podcasts** — browse/search top shows and stream **full episodes** via public RSS feeds
- **Listening stats** — minutes, streaks, top artists/genres, hour-of-day chart, 12-week calendar heatmap
- **Pro player** — queue, shuffle, repeat, playback speed, sleep timer, fullscreen view, keyboard shortcuts
- **Catalog & charts** — 700+ cached tracks, trending, new releases, artist & album pages, Song of the Day
- **Secure auth** with Clerk (Google sign-in; JWT-verified on every protected route) + rate limiting & security headers
- **25+ REST endpoints**, response-time instrumentation, API test suite (Vitest + Supertest), GitHub Actions CI
- **Performance-tuned:** MongoDB write-through cache, TTL chart caching, batch hydration, `.lean()` reads, code-split pages

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Router, Axios |
| Backend | Node.js, Express |
| AI | Groq API (Llama 3.3 70B) — assistant, playlists, search, reports |
| Database | MongoDB (Atlas) + Mongoose |
| Auth | Clerk (`@clerk/clerk-react` + `@clerk/express`) |
| Catalog APIs | iTunes Search API + Apple RSS charts + podcast RSS feeds (all free) |
| Testing / CI | Vitest, Supertest, mongodb-memory-server, GitHub Actions |
| Hosting | **Vercel** — client + Express API (serverless) in one project · MongoDB Atlas (DB) |

## 📂 Repository Layout

```
musify/
├── render.yaml            # Optional: Render blueprint (alternative API host)
└── spotify-clone/
    ├── api/               # Vercel serverless entry (wraps the Express app)
    ├── vercel.json        # Single-project deploy: static client + /api function
    ├── package.json       # API (serverless) dependencies
    ├── client/            # React + Vite frontend
    ├── server/            # Express API + iTunes seed script
    └── README.md          # 📖 Full docs: setup, API, architecture, performance
```

## 🚀 Quick Start & Deployment

The application lives in [`spotify-clone/`](./spotify-clone). See the **[full documentation](./spotify-clone/README.md)** for:

- Complete local setup (server + client + seeding 600 tracks)
- Every environment variable and where to obtain each key (Clerk, Atlas)
- Step-by-step **one-project Vercel deploy** (client + serverless API) + Atlas
- All API endpoints, architecture diagram, and performance methodology

```bash
# TL;DR local run
cd spotify-clone/server && cp .env.example .env && npm install && npm run seed && npm run dev
cd spotify-clone/client && cp .env.example .env && npm install && npm run dev
```

> **🔴 Live Demo:** **https://musify-sigma-blond.vercel.app**

## 📜 License

Copyright © 2026 **Namratha R**. All Rights Reserved. See [LICENSE](./LICENSE).
