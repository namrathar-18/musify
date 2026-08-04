import User from '../models/User.js';
import Track from '../models/Track.js';
import Play from '../models/Play.js';
import { getUserId } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { getTracksByIds } from '../lib/itunes.js';
import { awardXp, buildStats, levelFromXp, BADGES, XP_REWARDS } from '../lib/gamification.js';
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
  if (liked) awardXp(userId, XP_REWARDS.like).catch(() => {});
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

  awardXp(userId, XP_REWARDS.play).catch(() => {});

  res.json({ success: true });
});

// GET /api/users/me/progress — level, XP, badges (earned + locked)
export const getProgress = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const user = await ensureUser(userId);
  const stats = await buildStats(userId);
  const owned = new Set(user.badges || []);

  res.json({
    ...levelFromXp(user.xp || 0),
    stats,
    badges: BADGES.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      earned: owned.has(b.id),
    })),
  });
});

// PUT /api/users/me/profile — username, bio, visibility, favorite genres
export const updateProfile = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  await ensureUser(userId);
  const { username, bio, isPublic, favoriteGenres, onboarded } = req.body;
  const update = {};

  if (username !== undefined) {
    const clean = String(username).trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      const err = new Error('Username must be 3-20 characters: letters, numbers, underscore');
      err.status = 400;
      throw err;
    }
    const taken = await User.findOne({ username: clean, clerkUserId: { $ne: userId } }).lean();
    if (taken) {
      const err = new Error('That username is already taken');
      err.status = 409;
      throw err;
    }
    update.username = clean;
  }
  if (bio !== undefined) update.bio = String(bio).trim().slice(0, 200);
  if (isPublic !== undefined) update.isPublic = Boolean(isPublic);
  if (Array.isArray(favoriteGenres)) {
    update.favoriteGenres = favoriteGenres.slice(0, 8).map((g) => String(g).slice(0, 40));
  }
  if (onboarded !== undefined) update.onboarded = Boolean(onboarded);

  const user = await User.findOneAndUpdate(
    { clerkUserId: userId },
    { $set: update },
    { new: true }
  ).lean();

  res.json({
    username: user.username || null,
    bio: user.bio,
    isPublic: user.isPublic,
    favoriteGenres: user.favoriteGenres || [],
    onboarded: user.onboarded,
  });
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
    username: user.username || null,
    bio: user.bio || '',
    isPublic: user.isPublic !== false,
    favoriteGenres: user.favoriteGenres || [],
    onboarded: !!user.onboarded,
    level: levelFromXp(user.xp || 0).level,
    xp: user.xp || 0,
    premiumPlan: user.premiumPlan || 'free',
    premiumStatus: user.premiumStatus || 'none',
  });
});
