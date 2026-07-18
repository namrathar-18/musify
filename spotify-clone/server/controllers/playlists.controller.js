import Playlist from '../models/Playlist.js';
import Track from '../models/Track.js';
import { getUserId } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { getTracksByIds } from '../lib/itunes.js';

// GET /api/playlists
export const listPlaylists = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const playlists = await Playlist.find({ userId }).sort({ createdAt: -1 }).lean();
  res.json({ items: playlists });
});

// GET /api/playlists/:id  (single playlist with hydrated track details)
export const getPlaylist = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const playlist = await Playlist.findOne({ _id: id, userId }).lean();
  if (!playlist) {
    const err = new Error('Playlist not found');
    err.status = 404;
    throw err;
  }

  // Hydrate tracks from cache; fetch any missing from Spotify
  const trackIds = playlist.tracks.map((t) => t.spotifyTrackId);
  const cached = await Track.find({ spotifyId: { $in: trackIds } }).lean();
  const cachedMap = new Map(cached.map((t) => [t.spotifyId, t]));

  const missing = trackIds.filter((id) => !cachedMap.has(id));
  if (missing.length) {
    for (let i = 0; i < missing.length; i += 50) {
      const chunk = missing.slice(i, i + 50);
      const normalized = await getTracksByIds(chunk);
      if (normalized.length) {
        await Track.bulkWrite(
          normalized.map((t) => ({
            updateOne: {
              filter: { spotifyId: t.spotifyId },
              update: { $set: t },
              upsert: true,
            },
          }))
        );
        normalized.forEach((t) => cachedMap.set(t.spotifyId, t));
      }
    }
  }

  const hydratedTracks = playlist.tracks
    .map((t) => {
      const tr = cachedMap.get(t.spotifyTrackId);
      return tr ? { ...tr, addedAt: t.addedAt } : null;
    })
    .filter(Boolean);

  res.json({ ...playlist, tracks: hydratedTracks });
});

// POST /api/playlists
export const createPlaylist = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    const err = new Error('Playlist name is required');
    err.status = 400;
    throw err;
  }

  const playlist = await Playlist.create({
    userId,
    name: name.trim().slice(0, 100),
    description: (description?.trim() || '').slice(0, 300),
    tracks: [],
  });

  res.status(201).json(playlist);
});

// PUT /api/playlists/:id  (rename / update description)
export const updatePlaylist = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { name, description } = req.body;

  const update = {};
  if (name !== undefined) update.name = String(name).trim().slice(0, 100);
  if (description !== undefined) update.description = String(description).trim().slice(0, 300);

  const playlist = await Playlist.findOneAndUpdate(
    { _id: id, userId },
    { $set: update },
    { new: true }
  );
  if (!playlist) {
    const err = new Error('Playlist not found');
    err.status = 404;
    throw err;
  }
  res.json(playlist);
});

// DELETE /api/playlists/:id
export const deletePlaylist = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const result = await Playlist.findOneAndDelete({ _id: id, userId });
  if (!result) {
    const err = new Error('Playlist not found');
    err.status = 404;
    throw err;
  }
  res.json({ success: true });
});

// POST /api/playlists/:id/tracks   body: { spotifyTrackId }
export const addTrack = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { spotifyTrackId } = req.body;
  if (!spotifyTrackId) {
    const err = new Error('spotifyTrackId is required');
    err.status = 400;
    throw err;
  }

  const playlist = await Playlist.findOne({ _id: id, userId });
  if (!playlist) {
    const err = new Error('Playlist not found');
    err.status = 404;
    throw err;
  }

  // Prevent duplicates
  if (!playlist.tracks.some((t) => t.spotifyTrackId === spotifyTrackId)) {
    playlist.tracks.push({ spotifyTrackId, addedAt: new Date() });
    await playlist.save();
  }

  res.json(playlist);
});

// DELETE /api/playlists/:id/tracks/:trackId
export const removeTrack = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id, trackId } = req.params;

  const playlist = await Playlist.findOneAndUpdate(
    { _id: id, userId },
    { $pull: { tracks: { spotifyTrackId: trackId } } },
    { new: true }
  );
  if (!playlist) {
    const err = new Error('Playlist not found');
    err.status = 404;
    throw err;
  }
  res.json(playlist);
});
