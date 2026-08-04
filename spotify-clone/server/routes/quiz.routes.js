import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { newQuiz, submitQuiz, leaderboard } from '../controllers/quiz.controller.js';

const router = Router();

router.get('/leaderboard', leaderboard); // public

router.use(requireAuth);
router.get('/new', newQuiz);
router.post('/submit', submitQuiz);

export default router;
