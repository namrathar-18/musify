import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express';

import { connectDB } from './config/db.js';
import { responseTime } from './middleware/responseTime.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { securityHeaders, rateLimit } from './middleware/security.middleware.js';

import songsRoutes from './routes/songs.routes.js';
import searchRoutes from './routes/search.routes.js';
import playlistsRoutes from './routes/playlists.routes.js';
import usersRoutes from './routes/users.routes.js';
import {
  chartsRouter,
  artistsRouter,
  albumsRouter,
  podcastsRouter,
} from './routes/discover.routes.js';
import aiRoutes from './routes/ai.routes.js';

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(securityHeaders);
app.use(rateLimit);
app.use(responseTime);

// Clerk attaches req.auth to every request; individual routes opt into requireAuth
app.use(clerkMiddleware());

// Health check stays independent of the database so it can act as a liveness probe
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Lazily open (and reuse) the Mongo connection before any data route. In a
// serverless environment the connection is established on the first request and
// cached for subsequent warm invocations.
const withDB = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
};

app.use('/api/songs', withDB, songsRoutes);
app.use('/api/search', withDB, searchRoutes);
app.use('/api/playlists', withDB, playlistsRoutes);
app.use('/api/users', withDB, usersRoutes);
app.use('/api/charts', withDB, chartsRouter);
app.use('/api/artists', withDB, artistsRouter);
app.use('/api/albums', withDB, albumsRouter);
app.use('/api/podcasts', withDB, podcastsRouter);
app.use('/api/ai', withDB, aiRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

export default app;
