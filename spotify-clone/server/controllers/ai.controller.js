import Playlist from '../models/Playlist.js';
import Track from '../models/Track.js';
import Play from '../models/Play.js';
import { getUserId } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { chatJSON, aiEnabled } from '../lib/groq.js';
import { searchCatalog } from '../lib/itunes.js';

const cacheTracks = (tracks) => {
  if (!tracks?.length) return;
  Track.bulkWrite(
    tracks.map((t) => ({
      updateOne: {
        filter: { spotifyId: t.spotifyId },
        update: { $set: t },
        upsert: true,
      },
    }))
  ).catch(() => {});
};

// Run catalog searches for LLM-chosen queries and merge unique tracks.
// De-dupes by song identity (title+artist), not just catalog id, and skips
// karaoke/remix/re-recorded variants unless the user explicitly asked for them.
const VARIANT_RE = /karaoke|tribute|cover|instrumental|remix|sped.?up|slowed|8d|hour version|re-?record/i;

const gatherTracks = async (queries, perQuery = 3, cap = 30) => {
  const wantVariants = (queries || []).some((q) => VARIANT_RE.test(String(q)));
  const byId = new Set();
  const bySong = new Set();
  const out = [];

  const results = await Promise.allSettled(
    (queries || []).slice(0, 10).map((q) => searchCatalog(String(q), perQuery + 4))
  );
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    let taken = 0;
    for (const t of r.value.tracks) {
      if (taken >= perQuery) break;
      // Normalize hard: drop parenthetical suffixes and all punctuation so
      // "CAN'T STOP THE FEELING!" and "Can't Stop the Feeling! (Film Version)"
      // collapse to one key.
      const slug = (s) => s.toLowerCase().replace(/\s*[([].*/, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
      const songKey = `${slug(t.title)}|${slug(t.artist.split(',')[0])}`;
      if (byId.has(t.spotifyId) || bySong.has(songKey)) continue;
      if (!wantVariants && VARIANT_RE.test(t.title)) continue;
      byId.add(t.spotifyId);
      bySong.add(songKey);
      out.push(t);
      taken += 1;
    }
  }
  return out.slice(0, cap);
};

// GET /api/ai/status — lets the client show/hide AI features
export const status = (req, res) => {
  res.json({ enabled: aiEnabled() });
};

// POST /api/ai/chat   body: { messages: [{role:'user'|'assistant', content}] }
// Multi-turn: the client sends the running conversation back each time.
export const chat = asyncHandler(async (req, res) => {
  getUserId(req);
  const history = (req.body.messages || [])
    .filter((m) => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!history.length || history[history.length - 1].role !== 'user') {
    const err = new Error('messages must end with a user message');
    err.status = 400;
    throw err;
  }

  const data = await chatJSON(
    [
      {
        role: 'system',
        content:
          'You are the Musify music assistant. You help users discover music: recommend songs/artists/albums, explain artists and genres, and chat about music. Stay on music topics; politely decline anything else. ' +
          'Always respond with JSON: {"reply": string (conversational, 1-3 short paragraphs, no markdown headers), "searches": string[] (0-5 short catalog search queries — "song title artist" or "artist name" — for the specific songs/artists you recommended; empty array if none)}.',
      },
      ...history,
    ],
    { maxTokens: 700 }
  );

  const tracks = await gatherTracks(data.searches, 2, 10);
  cacheTracks(tracks);
  res.json({ reply: String(data.reply || ''), tracks });
});

// POST /api/ai/playlist   body: { prompt }
// Generates a REAL playlist in the user's library.
export const generatePlaylist = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const prompt = String(req.body.prompt || '').trim().slice(0, 300);
  if (!prompt) {
    const err = new Error('prompt is required');
    err.status = 400;
    throw err;
  }

  const data = await chatJSON(
    [
      {
        role: 'system',
        content:
          'You design music playlists. Given a user description, respond with JSON: ' +
          '{"name": string (catchy, <=40 chars, no quotes/emoji), "description": string (<=120 chars), ' +
          '"queries": string[] (10-14 searches, each "song title artist name" for a REAL well-known song fitting the vibe; vary artists and eras)}.',
      },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 900 }
  );

  const tracks = await gatherTracks(data.queries, 2, 25);
  if (!tracks.length) {
    const err = new Error('Could not find songs for that description, try rephrasing');
    err.status = 502;
    throw err;
  }
  cacheTracks(tracks);

  const playlist = await Playlist.create({
    userId,
    name: String(data.name || 'AI Playlist').slice(0, 60),
    description: `${String(data.description || '').slice(0, 140)} · Generated by Musify AI`,
    tracks: tracks.map((t) => ({ spotifyTrackId: t.spotifyId, addedAt: new Date() })),
  });

  res.status(201).json({ playlist, tracks });
});

// POST /api/ai/search   body: { query }
// Natural-language search → structured catalog searches.
export const smartSearch = asyncHandler(async (req, res) => {
  getUserId(req);
  const query = String(req.body.query || '').trim().slice(0, 200);
  if (!query) {
    const err = new Error('query is required');
    err.status = 400;
    throw err;
  }

  const data = await chatJSON(
    [
      {
        role: 'system',
        content:
          'You translate natural-language music requests into catalog searches. Respond with JSON: ' +
          '{"interpretation": string (<=80 chars, what you understood), "queries": string[] (3-6 short searches: song titles, artist names, or "genre music" terms that best satisfy the request)}.',
      },
      { role: 'user', content: query },
    ],
    { maxTokens: 400, temperature: 0.4 }
  );

  const tracks = await gatherTracks(data.queries, 4, 24);
  cacheTracks(tracks);
  res.json({ interpretation: String(data.interpretation || ''), tracks });
});

// GET /api/ai/weekly-report — narrative over the user's last 7 days of plays
export const weeklyReport = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [totals, topArtists, topGenres] = await Promise.all([
    Play.aggregate([
      { $match: { userId, playedAt: { $gte: since } } },
      { $group: { _id: null, plays: { $sum: 1 }, ms: { $sum: '$listenedMs' } } },
    ]),
    Play.aggregate([
      { $match: { userId, playedAt: { $gte: since }, artist: { $ne: '' } } },
      { $group: { _id: '$artist', plays: { $sum: 1 } } },
      { $sort: { plays: -1 } },
      { $limit: 5 },
    ]),
    Play.aggregate([
      { $match: { userId, playedAt: { $gte: since }, genre: { $ne: '' } } },
      { $group: { _id: '$genre', plays: { $sum: 1 } } },
      { $sort: { plays: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const plays = totals[0]?.plays || 0;
  if (plays < 3) {
    return res.json({
      enoughData: false,
      report: 'Play a few more songs this week and your AI listening report will appear here.',
      personality: null,
    });
  }

  const summary = {
    plays,
    minutes: Math.round((totals[0]?.ms || 0) / 60000),
    topArtists: topArtists.map((a) => `${a._id} (${a.plays})`),
    topGenres: topGenres.map((g) => `${g._id} (${g.plays})`),
  };

  const data = await chatJSON(
    [
      {
        role: 'system',
        content:
          'You write short, warm, personalized weekly music recaps. Given listening stats, respond with JSON: ' +
          '{"report": string (2-3 sentences, second person, specific to the data, no markdown), ' +
          '"personality": string (a fun 2-4 word music-personality label, e.g. "Midnight Pop Explorer")}.',
      },
      { role: 'user', content: JSON.stringify(summary) },
    ],
    { maxTokens: 300 }
  );

  res.json({
    enoughData: true,
    report: String(data.report || ''),
    personality: String(data.personality || ''),
    stats: summary,
  });
});
