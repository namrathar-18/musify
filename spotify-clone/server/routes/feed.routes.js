import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { follow, unfollow, following, feed } from '../controllers/feed.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/feed', feed);
router.get('/following', following);
router.post('/follow/:username', follow);
router.delete('/follow/:username', unfollow);

export default router;
