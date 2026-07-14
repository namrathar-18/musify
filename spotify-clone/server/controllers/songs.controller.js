import Track from '../models/Track.js';
import { getTrackById } from '../lib/itunes.js';
import { asyncHandler } from '../middleware/error.middleware.js';

// GET /api/songs?page=1&limit=20
export const listSongs = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Track.find({}, { __v: 0 })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Track.countDocuments(),
  ]);

  res.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /api/songs/:id   (id is spotifyId)
export const getSong = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try the cache first — this is what hits sub-200ms
  let track = await Track.findOne({ spotifyId: id }, { __v: 0 }).lean();
  if (track) return res.json(track);

  // Cache miss: fetch from the catalog API, normalize, upsert
  const normalized = await getTrackById(id);
  track = await Track.findOneAndUpdate(
    { spotifyId: normalized.spotifyId },
    { $set: normalized },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  res.json(track);
});
