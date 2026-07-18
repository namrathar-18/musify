import Track from '../models/Track.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import {
  getTrendingSongs,
  getTopAlbums,
  getNewReleases,
  getSongOfTheDay,
  getTopPodcasts,
} from '../lib/charts.js';
import {
  getArtistWithContent,
  getAlbumWithTracks,
  searchPodcasts,
  getPodcastById,
  searchCatalog,
} from '../lib/itunes.js';
import { getEpisodes } from '../lib/podcastFeed.js';

// Best-effort write-through so hydration elsewhere finds these tracks locally.
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
  ).catch((err) => console.warn('Track cache write failed:', err.message));
};

// GET /api/charts/trending
export const trending = asyncHandler(async (req, res) => {
  const items = await getTrendingSongs(25);
  cacheTracks(items);
  res.json({ items });
});

// GET /api/charts/top-albums
export const topAlbums = asyncHandler(async (req, res) => {
  res.json({ items: await getTopAlbums(20) });
});

// GET /api/charts/new-releases
export const newReleases = asyncHandler(async (req, res) => {
  const items = await getNewReleases(20);
  cacheTracks(items);
  res.json({ items });
});

// GET /api/charts/song-of-the-day
export const songOfTheDay = asyncHandler(async (req, res) => {
  const track = await getSongOfTheDay();
  if (track) cacheTracks([track]);
  res.json({ track });
});

// GET /api/charts/genre/:genre — genre row for the home page
export const genreRow = asyncHandler(async (req, res) => {
  const { tracks } = await searchCatalog(`${req.params.genre} music`, 15);
  cacheTracks(tracks);
  res.json({ items: tracks });
});

// GET /api/artists/:id
export const artistPage = asyncHandler(async (req, res) => {
  const data = await getArtistWithContent(req.params.id);
  cacheTracks(data.topSongs);
  res.json(data);
});

// GET /api/albums/:id
export const albumPage = asyncHandler(async (req, res) => {
  const data = await getAlbumWithTracks(req.params.id);
  cacheTracks(data.tracks);
  res.json(data);
});

// GET /api/podcasts/top
export const podcastsTop = asyncHandler(async (req, res) => {
  res.json({ items: await getTopPodcasts(20) });
});

// GET /api/podcasts/search?q=
export const podcastsSearch = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ items: [] });
  res.json({ items: await searchPodcasts(q, 20) });
});

// GET /api/podcasts/:id — show + episodes
export const podcastPage = asyncHandler(async (req, res) => {
  const show = await getPodcastById(req.params.id);
  if (!show.feedUrl) return res.json({ show, episodes: [] });
  try {
    const { description, episodes } = await getEpisodes(show.feedUrl, 30);
    res.json({ show: { ...show, description }, episodes });
  } catch (err) {
    // Feed host down/blocked — still render the show header
    console.warn('Podcast feed fetch failed:', err.message);
    res.json({ show, episodes: [] });
  }
});
