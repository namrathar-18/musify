# 🎵 Musify — Full-Stack Music Streaming App

A production-style **Spotify clone** built on the MERN stack with **Clerk** authentication and a **500+ track catalog** sourced from Apple's free iTunes Search API. Browse the catalog, create and manage playlists, like songs, track recently played, and stream real 30-second previews — behind a fast, Spotify-style UI.

**Author:** Namratha R — [@namrathar-18](https://github.com/namrathar-18)

---

## ✨ Highlights

- **500+ track catalog** seeded from the iTunes Search API and cached in MongoDB
- **Secure auth** with Clerk (JWT-verified on every protected route)
- **Full playlist management** — create, rename, delete, add/remove tracks
- **Liked songs & recently played** with server-side hydration
- **10+ REST endpoints** (users, playlists, songs, search) with response-time instrumentation
- **Performance-tuned:** MongoDB write-through cache, batch hydration, `.lean()` reads, lazy-loaded pages — cached endpoints stay well under 200 ms

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Router, Axios |
| Backend | Node.js, Express |
| Database | MongoDB (Atlas) + Mongoose |
| Auth | Clerk (`@clerk/clerk-react` + `@clerk/express`) |
| External API | iTunes Search API (free, no auth, real 30s previews) |
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

Namratha R
