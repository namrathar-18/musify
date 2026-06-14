import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  listPlaylists,
  getPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addTrack,
  removeTrack,
} from '../controllers/playlists.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', listPlaylists);
router.post('/', createPlaylist);
router.get('/:id', getPlaylist);
router.put('/:id', updatePlaylist);
router.delete('/:id', deletePlaylist);
router.post('/:id/tracks', addTrack);
router.delete('/:id/tracks/:trackId', removeTrack);

export default router;
