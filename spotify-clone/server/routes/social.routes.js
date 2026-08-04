import { Router } from 'express';
import { publicProfile, sharedPlaylist } from '../controllers/social.controller.js';

// Public, unauthenticated read-only surfaces — this is what makes a shared
// Musify link open for anyone.
export const profilesRouter = Router();
profilesRouter.get('/:username', publicProfile);

export const sharedRouter = Router();
sharedRouter.get('/playlist/:id', sharedPlaylist);
