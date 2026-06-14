import Track from '../models/Track.js';
import { searchSpotify, normalizeTrack } from '../lib/spotify.js';
import { asyncHandler } from '../middleware/error.middleware.js';

// GET /api/search?q=...&type=track,artist,album
export const search = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  const type = req.query.type || 'track,artist,album';
  if (!q) {
    return res.json({ tracks: [], artists: [], albums: [] });
  }

  const data = await searchSpotify(q, type, 20);

  // Normalize tracks for our shape; cache them as a side effect (best-effort)
  const tracks = (data.tracks?.items || []).map(normalizeTrack);
  const artists = (data.artists?.items || []).map((a) => ({
    id: a.id,
    name: a.name,
    image: a.images?.[0]?.url || '',
    followers: a.followers?.total || 0,
    genres: a.genres || [],
  }));
  const albums = (data.albums?.items || []).map((al) => ({
    id: al.id,
    name: al.name,
    artist: (al.artists || []).map((a) => a.name).join(', '),
    image: al.images?.[0]?.url || '',
    releaseDate: al.release_date,
  }));

  // Best-effort cache write — don't block the response
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
