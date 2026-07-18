import Play from '../models/Play.js';
import { getUserId } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

// Client sends its UTC offset (e.g. "+05:30") so hour/day buckets land in the
// listener's local day, not UTC's.
const tzOf = (req) => {
  const tz = String(req.query.tz || 'UTC');
  return /^[+-]\d{2}:\d{2}$/.test(tz) || tz === 'UTC' ? tz : 'UTC';
};

// Walk day counts (newest → oldest) to derive current & longest streaks.
const computeStreaks = (days, todayKey) => {
  const played = new Set(days.map((d) => d._id));
  const dayMs = 24 * 60 * 60 * 1000;

  let current = 0;
  // Current streak may start today or yesterday (today isn't over yet)
  let cursor = new Date(todayKey).getTime();
  if (!played.has(todayKey)) cursor -= dayMs;
  while (played.has(new Date(cursor).toISOString().slice(0, 10))) {
    current += 1;
    cursor -= dayMs;
  }

  let longest = 0;
  let run = 0;
  let prev = null;
  for (const key of [...played].sort()) {
    const t = new Date(key).getTime();
    run = prev !== null && t - prev === dayMs ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = t;
  }
  return { current, longest };
};

// GET /api/users/me/stats?days=30&tz=+05:30
export const getStats = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const days = Math.min(Math.max(parseInt(req.query.days) || 30, 7), 365);
  const timezone = tzOf(req);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const match = { userId, playedAt: { $gte: since } };

  const [totals, topArtists, topTracks, topGenres, byHour, byDay] =
    await Promise.all([
      Play.aggregate([
        { $match: match },
        { $group: { _id: null, plays: { $sum: 1 }, listenedMs: { $sum: '$listenedMs' } } },
      ]),
      Play.aggregate([
        { $match: { ...match, artist: { $ne: '' } } },
        {
          $group: {
            _id: '$artist',
            plays: { $sum: 1 },
            artistId: { $last: '$artistId' },
            image: { $last: '$albumArt' },
          },
        },
        { $sort: { plays: -1 } },
        { $limit: 10 },
      ]),
      Play.aggregate([
        { $match: { ...match, title: { $ne: '' } } },
        {
          $group: {
            _id: '$spotifyId',
            plays: { $sum: 1 },
            title: { $last: '$title' },
            artist: { $last: '$artist' },
            albumArt: { $last: '$albumArt' },
          },
        },
        { $sort: { plays: -1 } },
        { $limit: 10 },
      ]),
      Play.aggregate([
        { $match: { ...match, genre: { $ne: '' } } },
        { $group: { _id: '$genre', plays: { $sum: 1 } } },
        { $sort: { plays: -1 } },
        { $limit: 8 },
      ]),
      Play.aggregate([
        { $match: match },
        { $group: { _id: { $hour: { date: '$playedAt', timezone } }, plays: { $sum: 1 } } },
      ]),
      Play.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$playedAt', timezone } },
            plays: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

  const hours = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    plays: byHour.find((b) => b._id === h)?.plays || 0,
  }));

  // "Today" in the listener's timezone, derived from the same offset used above
  let offsetMs = 0;
  if (timezone !== 'UTC') {
    const [, sign, hh, mm] = timezone.match(/^([+-])(\d{2}):(\d{2})$/);
    offsetMs = (sign === '-' ? -1 : 1) * (parseInt(hh) * 60 + parseInt(mm)) * 60000;
  }
  const todayKey = new Date(Date.now() + offsetMs).toISOString().slice(0, 10);

  res.json({
    rangeDays: days,
    totalPlays: totals[0]?.plays || 0,
    listenedMinutes: Math.round((totals[0]?.listenedMs || 0) / 60000),
    topArtists: topArtists.map((a) => ({
      name: a._id,
      plays: a.plays,
      artistId: a.artistId,
      image: a.image,
    })),
    topTracks: topTracks.map((t) => ({
      spotifyId: t._id,
      title: t.title,
      artist: t.artist,
      albumArt: t.albumArt,
      plays: t.plays,
    })),
    topGenres: topGenres.map((g) => ({ name: g._id, plays: g.plays })),
    byHour: hours,
    byDay: byDay.map((d) => ({ date: d._id, plays: d.plays })),
    streaks: computeStreaks(byDay, todayKey),
  });
});
