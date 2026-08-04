import Quiz from '../models/Quiz.js';
import Track from '../models/Track.js';
import User from '../models/User.js';
import { getUserId } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { awardXp, XP_REWARDS, levelFromXp } from '../lib/gamification.js';

const QUESTIONS = 5;
const OPTIONS = 4;

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// GET /api/quiz/new — deal a round of "guess the song" questions
export const newQuiz = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  // Sample playable tracks with distinct titles so options are unambiguous
  const pool = await Track.aggregate([
    { $match: { previewUrl: { $nin: ['', null] }, title: { $ne: '' } } },
    { $sample: { size: QUESTIONS * OPTIONS * 2 } },
    { $project: { _id: 0, spotifyId: 1, title: 1, artist: 1, albumArt: 1, previewUrl: 1 } },
  ]);

  const seen = new Set();
  const unique = pool.filter((t) => {
    const key = t.title.toLowerCase().replace(/\s*[([].*/, '').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length < QUESTIONS * OPTIONS) {
    const err = new Error('Not enough tracks in the catalog to build a quiz');
    err.status = 503;
    throw err;
  }

  const answers = [];
  const questions = [];
  for (let q = 0; q < QUESTIONS; q++) {
    const slice = unique.slice(q * OPTIONS, (q + 1) * OPTIONS);
    const correct = slice[0];
    const options = shuffle(slice).map((t) => ({ title: t.title, artist: t.artist }));
    const correctIndex = options.findIndex(
      (o) => o.title === correct.title && o.artist === correct.artist
    );
    answers.push(String(correctIndex));
    questions.push({
      // Only the audio is revealed — no title/artist leak in the payload
      previewUrl: correct.previewUrl,
      options,
    });
  }

  const quiz = await Quiz.create({ userId, answers });
  res.json({ quizId: quiz._id, questions, total: QUESTIONS });
});

// POST /api/quiz/submit  { quizId, picks: [index...] }
export const submitQuiz = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { quizId, picks } = req.body;

  const quiz = await Quiz.findOne({ _id: quizId, userId });
  if (!quiz) {
    const err = new Error('Quiz round not found or expired');
    err.status = 404;
    throw err;
  }
  if (quiz.scored) {
    const err = new Error('This round was already submitted');
    err.status = 409;
    throw err;
  }

  const picked = Array.isArray(picks) ? picks : [];
  const results = quiz.answers.map((correct, i) => ({
    correctIndex: Number(correct),
    pickedIndex: picked[i] === null || picked[i] === undefined ? null : Number(picked[i]),
    correct: String(picked[i]) === correct,
  }));
  const score = results.filter((r) => r.correct).length;

  quiz.scored = true;
  await quiz.save();

  const perfect = score === quiz.answers.length;
  const xpEarned = score * XP_REWARDS.quizCorrect + (perfect ? XP_REWARDS.quizPerfect : 0);

  await User.updateOne(
    { clerkUserId: userId },
    { $inc: { quizGamesPlayed: 1 }, $max: { quizHighScore: score } }
  );
  const { newBadges } = await awardXp(userId, xpEarned);
  const user = await User.findOne({ clerkUserId: userId }).lean();

  res.json({
    score,
    total: quiz.answers.length,
    perfect,
    xpEarned,
    results,
    highScore: user?.quizHighScore || score,
    level: levelFromXp(user?.xp || 0),
    newBadges: newBadges.map((b) => ({ id: b.id, name: b.name, icon: b.icon })),
  });
});

// GET /api/quiz/leaderboard — top public players
export const leaderboard = asyncHandler(async (req, res) => {
  const rows = await User.find(
    { quizGamesPlayed: { $gt: 0 }, isPublic: { $ne: false } },
    { displayName: 1, username: 1, quizHighScore: 1, quizGamesPlayed: 1, xp: 1, _id: 0 }
  )
    .sort({ quizHighScore: -1, xp: -1 })
    .limit(20)
    .lean();

  res.json({
    items: rows.map((u, i) => ({
      rank: i + 1,
      name: u.displayName || u.username || 'Anonymous',
      username: u.username || null,
      highScore: u.quizHighScore,
      games: u.quizGamesPlayed,
      level: levelFromXp(u.xp || 0).level,
    })),
  });
});
