import User from '../models/User.js';
import Play from '../models/Play.js';
import Playlist from '../models/Playlist.js';
import Track from '../models/Track.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { levelFromXp, BADGES } from '../lib/gamification.js';

const notFound = (msg) => {
  const err = new Error(msg);
  err.status = 404;
  return err;
};

// GET /api/profiles/:username — public profile card (no auth required)
export const publicProfile = asyncHandler(async (req, res) => {
  const username = String(req.params.username).toLowerCase();
  const user = await User.findOne({ username }).lean();
  if (!user) throw notFound('Profile not found');
  if (user.isPublic === false) throw notFound('This profile is private');

  const since = new Date(Date.now() - 30 * 86400000);
  const [topArtists, playlists, totals, followers] = await Promise.all([
    Play.aggregate([
      { $match: { userId: user.clerkUserId, playedAt: { $gte: since }, artist: { $ne: '' } } },
      {
        $group: {
          _id: '$artist',
          plays: { $sum: 1 },
          artistId: { $last: '$artistId' },
          image: { $last: '$albumArt' },
        },
      },
      { $sort: { plays: -1 } },
      { $limit: 6 },
    ]),
    Playlist.find({ userId: user.clerkUserId, isPublic: true })
      .sort({ updatedAt: -1 })
      .limit(12)
      .lean(),
    Play.aggregate([
      { $match: { userId: user.clerkUserId } },
      { $group: { _id: null, plays: { $sum: 1 }, ms: { $sum: '$listenedMs' } } },
    ]),
    User.countDocuments({ following: user.clerkUserId }),
  ]);

  // If the viewer is signed in, tell them whether they already follow
  const viewerId = typeof req.auth === 'function' ? req.auth()?.userId : req.auth?.userId;
  let isFollowing = false;
  let isSelf = false;
  if (viewerId) {
    isSelf = viewerId === user.clerkUserId;
    if (!isSelf) {
      const viewer = await User.findOne(
        { clerkUserId: viewerId, following: user.clerkUserId },
        { _id: 1 }
      ).lean();
      isFollowing = Boolean(viewer);
    }
  }

  const owned = new Set(user.badges || []);
  res.json({
    username: user.username,
    displayName: user.displayName || user.username,
    bio: user.bio || '',
    favoriteGenres: user.favoriteGenres || [],
    isPremium: user.premiumStatus === 'active' || user.premiumStatus === 'canceling',
    joined: user.createdAt,
    ...levelFromXp(user.xp || 0),
    totalPlays: totals[0]?.plays || 0,
    minutesListened: Math.round((totals[0]?.ms || 0) / 60000),
    quizHighScore: user.quizHighScore || 0,
    followers,
    followingCount: (user.following || []).length,
    isFollowing,
    isSelf,
    badges: BADGES.filter((b) => owned.has(b.id)).map((b) => ({
      id: b.id,
      name: b.name,
      icon: b.icon,
      description: b.description,
    })),
    topArtists: topArtists.map((a) => ({
      name: a._id,
      plays: a.plays,
      artistId: a.artistId,
      image: a.image,
    })),
    playlists: playlists.map((p) => ({
      id: p._id,
      name: p.name,
      description: p.description,
      trackCount: p.tracks.length,
    })),
  });
});

// GET /api/playlists/shared/:id — read-only view of a shared playlist
export const sharedPlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findById(req.params.id).lean().catch(() => null);
  if (!playlist) throw notFound('Playlist not found');
  if (!playlist.isPublic) throw notFound('This playlist is private');

  const ids = playlist.tracks.map((t) => t.spotifyTrackId);
  const cached = await Track.find({ spotifyId: { $in: ids } }, { __v: 0 }).lean();
  const byId = new Map(cached.map((t) => [t.spotifyId, t]));
  const owner = await User.findOne(
    { clerkUserId: playlist.userId },
    { username: 1, displayName: 1, isPublic: 1 }
  ).lean();

  res.json({
    id: playlist._id,
    name: playlist.name,
    description: playlist.description,
    owner:
      owner && owner.isPublic !== false
        ? { username: owner.username || null, displayName: owner.displayName || 'A listener' }
        : { username: null, displayName: 'A listener' },
    tracks: ids.map((id) => byId.get(id)).filter(Boolean),
  });
});
