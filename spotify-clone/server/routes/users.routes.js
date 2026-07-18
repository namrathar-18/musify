import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getMe,
  getLikedSongs,
  toggleLike,
  getRecent,
  recordPlay,
} from '../controllers/users.controller.js';
import { getStats } from '../controllers/stats.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/me', getMe);
router.get('/me/stats', getStats);
router.get('/me/liked', getLikedSongs);
router.post('/me/liked/:trackId', toggleLike);
router.get('/me/recent', getRecent);
router.post('/me/recent/:trackId', recordPlay);

export default router;
