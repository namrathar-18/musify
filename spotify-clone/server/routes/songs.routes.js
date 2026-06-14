import { Router } from 'express';
import { listSongs, getSong } from '../controllers/songs.controller.js';

const router = Router();

router.get('/', listSongs);
router.get('/:id', getSong);

export default router;
