import User from '../models/User.js';
import Play from '../models/Play.js';
import Playlist from '../models/Playlist.js';

// ── XP & levels ───────────────────────────────────────────────────────────
// Levels use a widening curve: level N needs 100 * N^1.6 cumulative XP, so
// early levels come fast and later ones stay meaningful.
export const XP_REWARDS = {
  play: 2,
  like: 3,
  playlistCreated: 25,
  aiPlaylist: 40,
  quizCorrect: 10,
  quizPerfect: 50,
  dailyStreak: 15,
};

const xpForLevel = (level) => Math.round(100 * Math.pow(level, 1.6));

export const levelFromXp = (xp) => {
  let level = 1;
  while (level < 100 && xp >= xpForLevel(level + 1)) level += 1;
  const currentFloor = level === 1 ? 0 : xpForLevel(level);
  const nextAt = xpForLevel(level + 1);
  return {
    level,
    xp,
    currentFloor,
    nextLevelAt: nextAt,
    progress: Math.min(1, Math.max(0, (xp - currentFloor) / (nextAt - currentFloor))),
  };
};

// ── Badge catalog ─────────────────────────────────────────────────────────
// Each badge has a `check` that runs against a stats snapshot, so adding a
// badge never means touching the award pipeline.
export const BADGES = [
  {
    id: 'first-play',
    name: 'First Notes',
    description: 'Play your first track',
    icon: '🎵',
    check: (s) => s.plays >= 1,
  },
  {
    id: 'explorer-25',
    name: 'Explorer',
    description: 'Play 25 tracks',
    icon: '🧭',
    check: (s) => s.plays >= 25,
  },
  {
    id: 'audiophile-100',
    name: 'Audiophile',
    description: 'Play 100 tracks',
    icon: '🎧',
    check: (s) => s.plays >= 100,
  },
  {
    id: 'curator',
    name: 'Curator',
    description: 'Create your first playlist',
    icon: '📀',
    check: (s) => s.playlists >= 1,
  },
  {
    id: 'collector',
    name: 'Collector',
    description: 'Create 5 playlists',
    icon: '🗂️',
    check: (s) => s.playlists >= 5,
  },
  {
    id: 'heartbeat',
    name: 'Heartbeat',
    description: 'Like 10 songs',
    icon: '💜',
    check: (s) => s.likes >= 10,
  },
  {
    id: 'taste-maker',
    name: 'Taste Maker',
    description: 'Like 50 songs',
    icon: '⭐',
    check: (s) => s.likes >= 50,
  },
  {
    id: 'genre-hopper',
    name: 'Genre Hopper',
    description: 'Listen across 5 different genres',
    icon: '🌈',
    check: (s) => s.genres >= 5,
  },
  {
    id: 'streak-3',
    name: 'Warming Up',
    description: 'Listen 3 days in a row',
    icon: '🔥',
    check: (s) => s.streak >= 3,
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Listen 7 days in a row',
    icon: '⚡',
    check: (s) => s.streak >= 7,
  },
  {
    id: 'quiz-rookie',
    name: 'Quiz Rookie',
    description: 'Finish your first music quiz',
    icon: '🎯',
    check: (s) => s.quizGames >= 1,
  },
  {
    id: 'quiz-master',
    name: 'Quiz Master',
    description: 'Score a perfect quiz round',
    icon: '🏆',
    check: (s) => s.quizHighScore >= 5,
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Play music after midnight',
    icon: '🦉',
    check: (s) => s.nightPlays >= 1,
  },
  {
    id: 'level-5',
    name: 'Rising Star',
    description: 'Reach level 5',
    icon: '🌟',
    check: (s) => s.level >= 5,
  },
  {
    id: 'level-10',
    name: 'Legend',
    description: 'Reach level 10',
    icon: '👑',
    check: (s) => s.level >= 10,
  },
];

// Longest run of consecutive days ending today/yesterday
const currentStreak = (dayKeys) => {
  const played = new Set(dayKeys);
  const dayMs = 86400000;
  let cursor = Date.now();
  if (!played.has(new Date(cursor).toISOString().slice(0, 10))) cursor -= dayMs;
  let streak = 0;
  while (played.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak += 1;
    cursor -= dayMs;
  }
  return streak;
};

// Snapshot of everything the badge checks need — one pass, few queries.
export const buildStats = async (userId) => {
  const [user, playAgg, playlists] = await Promise.all([
    User.findOne({ clerkUserId: userId }).lean(),
    Play.aggregate([
      { $match: { userId } },
      {
        $facet: {
          total: [{ $count: 'n' }],
          genres: [{ $match: { genre: { $ne: '' } } }, { $group: { _id: '$genre' } }, { $count: 'n' }],
          days: [
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$playedAt' } } } },
          ],
          night: [
            { $match: { $expr: { $lt: [{ $hour: '$playedAt' }, 5] } } },
            { $count: 'n' },
          ],
        },
      },
    ]),
    Playlist.countDocuments({ userId }),
  ]);

  const facet = playAgg[0] || {};
  const xp = user?.xp || 0;
  return {
    plays: facet.total?.[0]?.n || 0,
    genres: facet.genres?.[0]?.n || 0,
    nightPlays: facet.night?.[0]?.n || 0,
    streak: currentStreak((facet.days || []).map((d) => d._id)),
    playlists,
    likes: user?.likedSongs?.length || 0,
    quizGames: user?.quizGamesPlayed || 0,
    quizHighScore: user?.quizHighScore || 0,
    xp,
    level: levelFromXp(xp).level,
  };
};

// Award XP and evaluate badges. Returns newly-earned badges so the UI can
// celebrate them. Safe to call fire-and-forget.
export const awardXp = async (userId, amount, { evaluateBadges = true } = {}) => {
  const user = await User.findOneAndUpdate(
    { clerkUserId: userId },
    { $inc: { xp: Math.max(0, amount) } },
    { new: true }
  );
  if (!user || !evaluateBadges) return { newBadges: [] };

  const stats = await buildStats(userId);
  const owned = new Set(user.badges || []);
  const earned = BADGES.filter((b) => !owned.has(b.id) && b.check(stats)).map((b) => b.id);

  if (earned.length) {
    await User.updateOne({ clerkUserId: userId }, { $addToSet: { badges: { $each: earned } } });
  }
  return { newBadges: BADGES.filter((b) => earned.includes(b.id)) };
};
