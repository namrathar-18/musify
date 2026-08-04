import User from '../models/User.js';
import Play from '../models/Play.js';
import Playlist from '../models/Playlist.js';
import { getUserId } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const notFound = (msg) => {
  const err = new Error(msg);
  err.status = 404;
  return err;
};

// Resolve a @username to an account that is actually discoverable
const findPublicUser = async (username) => {
  const user = await User.findOne({ username: String(username).toLowerCase() }).lean();
  if (!user || user.isPublic === false) throw notFound('Profile not found');
  return user;
};

// POST /api/social/follow/:username
export const follow = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const target = await findPublicUser(req.params.username);
  if (target.clerkUserId === userId) {
    const err = new Error('You cannot follow yourself');
    err.status = 400;
    throw err;
  }
  await User.updateOne({ clerkUserId: userId }, { $addToSet: { following: target.clerkUserId } });
  res.json({ following: true, username: target.username });
});

// DELETE /api/social/follow/:username
export const unfollow = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const target = await User.findOne({ username: String(req.params.username).toLowerCase() }).lean();
  if (!target) throw notFound('Profile not found');
  await User.updateOne({ clerkUserId: userId }, { $pull: { following: target.clerkUserId } });
  res.json({ following: false, username: target.username });
});

// GET /api/social/following — who I follow (profile cards)
export const following = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const me = await User.findOne({ clerkUserId: userId }, { following: 1 }).lean();
  const ids = me?.following || [];
  if (!ids.length) return res.json({ items: [] });

  const users = await User.find(
    { clerkUserId: { $in: ids }, isPublic: { $ne: false } },
    { username: 1, displayName: 1, xp: 1, badges: 1, clerkUserId: 1 }
  ).lean();

  res.json({
    items: users.map((u) => ({
      username: u.username,
      displayName: u.displayName,
      badgeCount: (u.badges || []).length,
    })),
  });
});

// GET /api/social/feed — what the people you follow have been up to.
// Blends their latest tracks with newly shared playlists, newest first.
export const feed = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const me = await User.findOne({ clerkUserId: userId }, { following: 1 }).lean();
  const ids = (me?.following || []).filter(Boolean);
  if (!ids.length) return res.json({ items: [], followingCount: 0 });

  const since = new Date(Date.now() - 14 * 86400000);
  const [plays, playlists, users] = await Promise.all([
    // Latest 3 distinct tracks per followed user, so one heavy listener
    // can't flood the feed
    Play.aggregate([
      { $match: { userId: { $in: ids }, playedAt: { $gte: since }, title: { $ne: '' } } },
      { $sort: { playedAt: -1 } },
      {
        $group: {
          _id: { user: '$userId', track: '$spotifyId' },
          userId: { $first: '$userId' },
          spotifyId: { $first: '$spotifyId' },
          title: { $first: '$title' },
          artist: { $first: '$artist' },
          artistId: { $first: '$artistId' },
          albumArt: { $first: '$albumArt' },
          playedAt: { $first: '$playedAt' },
        },
      },
      { $sort: { playedAt: -1 } },
      {
        $group: {
          _id: '$userId',
          tracks: {
            $push: {
              spotifyId: '$spotifyId',
              title: '$title',
              artist: '$artist',
              artistId: '$artistId',
              albumArt: '$albumArt',
              playedAt: '$playedAt',
            },
          },
        },
      },
      { $project: { tracks: { $slice: ['$tracks', 3] } } },
    ]),
    Playlist.find({ userId: { $in: ids }, isPublic: true, updatedAt: { $gte: since } })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean(),
    User.find({ clerkUserId: { $in: ids } }, { clerkUserId: 1, username: 1, displayName: 1 }).lean(),
  ]);

  const byId = new Map(users.map((u) => [u.clerkUserId, u]));
  const actor = (id) => ({
    username: byId.get(id)?.username || null,
    displayName: byId.get(id)?.displayName || 'A listener',
  });

  const items = [
    ...plays.flatMap((row) =>
      row.tracks.map((t) => ({
        type: 'play',
        at: t.playedAt,
        user: actor(row._id),
        track: t,
      }))
    ),
    ...playlists.map((p) => ({
      type: 'playlist',
      at: p.updatedAt,
      user: actor(p.userId),
      playlist: { id: p._id, name: p.name, trackCount: p.tracks.length },
    })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  res.json({ items: items.slice(0, 40), followingCount: ids.length });
});

// GET /api/users/me/time-capsule — your listening, replayed from the past.
// Windows are ±3 days around each anniversary so there's usually something
// to show even for casual listeners.
export const timeCapsule = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const day = 86400000;

  const windows = [
    { id: 'week', label: 'Last week', daysAgo: 7, spread: 1 },
    { id: 'month', label: 'A month ago', daysAgo: 30, spread: 3 },
    { id: 'sixMonths', label: 'Six months ago', daysAgo: 182, spread: 5 },
    { id: 'year', label: 'A year ago', daysAgo: 365, spread: 5 },
  ];

  const sections = await Promise.all(
    windows.map(async (w) => {
      const center = Date.now() - w.daysAgo * day;
      const rows = await Play.aggregate([
        {
          $match: {
            userId,
            playedAt: {
              $gte: new Date(center - w.spread * day),
              $lte: new Date(center + w.spread * day),
            },
            title: { $ne: '' },
          },
        },
        {
          $group: {
            _id: '$spotifyId',
            plays: { $sum: 1 },
            title: { $last: '$title' },
            artist: { $last: '$artist' },
            artistId: { $last: '$artistId' },
            albumArt: { $last: '$albumArt' },
            playedAt: { $max: '$playedAt' },
          },
        },
        { $sort: { plays: -1, playedAt: -1 } },
        { $limit: 8 },
      ]);

      return {
        id: w.id,
        label: w.label,
        date: new Date(center).toISOString().slice(0, 10),
        tracks: rows.map((r) => ({
          spotifyId: r._id,
          title: r.title,
          artist: r.artist,
          artistId: r.artistId,
          albumArt: r.albumArt,
          plays: r.plays,
        })),
      };
    })
  );

  const populated = sections.filter((s) => s.tracks.length > 0);
  res.json({ sections: populated, empty: populated.length === 0 });
});
