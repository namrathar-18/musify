import User from '../models/User.js';
import Track from '../models/Track.js';
import Play from '../models/Play.js';
import { getUserId } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { getTracksByIds } from '../lib/itunes.js';
import { clerkClient } from '@clerk/express';

// Lazy upsert of the local user record matching the Clerk user
const ensureUser = async (clerkUserId) => {
  let user = await User.findOne({ clerkUserId });
  if (user) return user;

  // Pull profile info from Clerk
  let email = '';
  let displayName = '';
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    email =
      clerkUser.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || '';
    displayName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      clerkUser.username ||
      email ||
      'User';
  } catch (e) {
    // Fallback if Clerk fetch fails (e.g. test environment)
    email = `${clerkUserId}@unknown.local`;
    displayName = 'User';
  }

  user = await User.create({
    clerkUserId,
    email,
    displayName,
    likedSongs: [],
    recentlyPlayed: [],
  });
  return user;
};

const hydrateTracks = async (trackIds) => {
  if (!trackIds.length) return [];
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

  return trackIds.map((id) => cachedMap.get(id)).filter(Boolean);
};

// GET /api/users/me/liked
export const getLikedSongs = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const user = await ensureUser(userId);
  const tracks = await hydrateTracks(user.likedSongs);
  res.json({ items: tracks });
});

// POST /api/users/me/liked/:trackId   (toggle)
export const toggleLike = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { trackId } = req.params;
  const user = await ensureUser(userId);

  const idx = user.likedSongs.indexOf(trackId);
  let liked;
  if (idx >= 0) {
    user.likedSongs.splice(idx, 1);
    liked = false;
  } else {
    user.likedSongs.push(trackId);
    liked = true;
  }
  await user.save();
  res.json({ liked, likedSongs: user.likedSongs });
});

// GET /api/users/me/recent
export const getRecent = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const user = await ensureUser(userId);

  const recentIds = user.recentlyPlayed.map((r) => r.spotifyTrackId);
  const tracks = await hydrateTracks(recentIds);
  const trackMap = new Map(tracks.map((t) => [t.spotifyId, t]));

  const items = user.recentlyPlayed
    .map((r) => {
      const t = trackMap.get(r.spotifyTrackId);
      return t ? { ...t, playedAt: r.playedAt } : null;
    })
    .filter(Boolean);

  res.json({ items });
});

// POST /api/users/me/recent/:trackId  (record a play)
export const recordPlay = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { trackId } = req.params;
  const user = await ensureUser(userId);

  // Remove any prior entry of the same track, then add to front, cap at 50
  user.recentlyPlayed = user.recentlyPlayed.filter((r) => r.spotifyTrackId !== trackId);
  user.recentlyPlayed.unshift({ spotifyTrackId: trackId, playedAt: new Date() });
  if (user.recentlyPlayed.length > 50) {
    user.recentlyPlayed = user.recentlyPlayed.slice(0, 50);
  }
  await user.save();

  // Durable play log for the stats dashboard (best-effort, non-blocking)
  Track.findOne({ spotifyId: trackId })
    .lean()
    .then((t) =>
      Play.create({
        userId,
        spotifyId: trackId,
        title: t?.title || '',
        artist: t?.artist || '',
        artistId: t?.artistId || '',
        genre: t?.genre || '',
        albumArt: t?.albumArt || '',
        listenedMs: Math.min(t?.duration || 30000, 30000),
      })
    )
    .catch((err) => console.warn('Play log failed:', err.message));

  res.json({ success: true });
});

// GET /api/users/me  (profile + summary)
export const getMe = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const user = await ensureUser(userId);
  res.json({
    clerkUserId: user.clerkUserId,
    email: user.email,
    displayName: user.displayName,
    likedSongCount: user.likedSongs.length,
    likedSongIds: user.likedSongs,
  });
});
