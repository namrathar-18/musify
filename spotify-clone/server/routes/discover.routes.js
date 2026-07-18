import { Router } from 'express';
import {
  trending,
  topAlbums,
  newReleases,
  songOfTheDay,
  genreRow,
  artistPage,
  albumPage,
  podcastsTop,
  podcastsSearch,
  podcastPage,
} from '../controllers/discover.controller.js';

export const chartsRouter = Router();
chartsRouter.get('/trending', trending);
chartsRouter.get('/top-albums', topAlbums);
chartsRouter.get('/new-releases', newReleases);
chartsRouter.get('/song-of-the-day', songOfTheDay);
chartsRouter.get('/genre/:genre', genreRow);

export const artistsRouter = Router();
artistsRouter.get('/:id', artistPage);

export const albumsRouter = Router();
albumsRouter.get('/:id', albumPage);

export const podcastsRouter = Router();
podcastsRouter.get('/top', podcastsTop);
podcastsRouter.get('/search', podcastsSearch);
podcastsRouter.get('/:id', podcastPage);
