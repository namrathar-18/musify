import { Router } from 'express';
import { requireAuth, getUserId } from '../middleware/auth.middleware.js';
import {
  status,
  chat,
  generatePlaylist,
  smartSearch,
  weeklyReport,
} from '../controllers/ai.controller.js';

// Simple per-user sliding-window rate limit for LLM-backed endpoints.
// In-memory is per-lambda on serverless — a soft cap, but it stops runaway
// loops and keeps the free Groq tier comfortable.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CALLS = 30;
const usage = new Map();

const aiRateLimit = (req, res, next) => {
  const userId = getUserId(req);
  const now = Date.now();
  const calls = (usage.get(userId) || []).filter((t) => now - t < WINDOW_MS);
  if (calls.length >= MAX_CALLS) {
    return res.status(429).json({ error: 'AI rate limit reached — try again in a few minutes' });
  }
  calls.push(now);
  usage.set(userId, calls);
  next();
};

const router = Router();

router.get('/status', status); // public: lets signed-out UI hide AI entry points

router.use(requireAuth);
router.post('/chat', aiRateLimit, chat);
router.post('/playlist', aiRateLimit, generatePlaylist);
router.post('/search', aiRateLimit, smartSearch);
router.get('/weekly-report', aiRateLimit, weeklyReport);

export default router;
