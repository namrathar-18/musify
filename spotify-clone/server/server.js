import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express';

import { connectDB } from './config/db.js';
import { responseTime } from './middleware/responseTime.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

import songsRoutes from './routes/songs.routes.js';
import searchRoutes from './routes/search.routes.js';
import playlistsRoutes from './routes/playlists.routes.js';
import usersRoutes from './routes/users.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(responseTime);

// Clerk attaches req.auth to every request; individual routes opt into requireAuth
app.use(clerkMiddleware());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/songs', songsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/users', usersRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
