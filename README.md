# 🎵 Musify — Full-Stack Music Streaming App

A production-style **Spotify clone** built on the MERN stack with **Clerk** authentication and the **Spotify Web API**. Browse a catalog of **500+ tracks**, create and manage playlists, like songs, track recently played, and stream 30-second previews — behind a fast, Spotify-style UI.

**Author:** Namratha R — [@namrathar-18](https://github.com/namrathar-18)

---

## ✨ Highlights

- **500+ track catalog** seeded from the Spotify Web API and cached in MongoDB
- **Secure auth** with Clerk (JWT-verified on every protected route)
- **Full playlist management** — create, rename, delete, add/remove tracks
- **Liked songs & recently played** with server-side hydration
- **10+ REST endpoints** (users, playlists, songs, search) with response-time instrumentation
- **Performance-tuned:** MongoDB write-through cache, in-memory Spotify token cache, `.lean()` reads, lazy-loaded pages — cached endpoints stay well under 200 ms

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Router, Axios |
| Backend | Node.js, Express |
| Database | MongoDB (Atlas) + Mongoose |
| Auth | Clerk (`@clerk/clerk-react` + `@clerk/express`) |
| External API | Spotify Web API (client-credentials flow) |
| Hosting | Vercel (client) · Render (API) · MongoDB Atlas (DB) |

## 📂 Repository Layout

```
musify/
├── render.yaml            # One-click Render blueprint for the API
└── spotify-clone/
    ├── client/            # React + Vite frontend
    ├── server/            # Express API + Spotify seed script
    └── README.md          # 📖 Full docs: setup, API, architecture, performance
```

## 🚀 Quick Start & Deployment

The application lives in [`spotify-clone/`](./spotify-clone). See the **[full documentation](./spotify-clone/README.md)** for:

- Complete local setup (server + client + seeding 600 tracks)
- Every environment variable and where to obtain each key (Clerk, Spotify, Atlas)
- Step-by-step **Vercel + Render + Atlas** deployment guide
- All API endpoints, architecture diagram, and performance methodology

```bash
# TL;DR local run
cd spotify-clone/server && cp .env.example .env && npm install && npm run seed && npm run dev
cd spotify-clone/client && cp .env.example .env && npm install && npm run dev
```

> **Live Demo:** deploy in ~10 minutes with the guide above, then drop your URL here: `https://musify.vercel.app`

## 📜 License

MIT
