import Track from '../models/Track.js';
import { searchCatalog } from '../lib/itunes.js';
import { asyncHandler } from '../middleware/error.middleware.js';

// GET /api/search?q=...
export const search = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) {
    return res.json({ tracks: [], artists: [], albums: [] });
  }

  const { tracks, artists, albums } = await searchCatalog(q, 25);

  // Best-effort cache write so hydration (playlists/liked) can resolve these
  // tracks later without another upstream call. Don't block the response.
  if (tracks.length) {
    const ops = tracks.map((t) => ({
      updateOne: {
        filter: { spotifyId: t.spotifyId },
        update: { $set: t },
        upsert: true,
      },
    }));
    Track.bulkWrite(ops).catch((err) =>
      console.warn('Search track cache write failed:', err.message)
    );
  }

  res.json({ tracks, artists, albums });
});
