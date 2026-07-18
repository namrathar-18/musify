import { cached } from './cache.js';
import { getTracksByIds, getWithRetry } from './itunes.js';

// Apple's marketing-tools RSS feeds — free, keyless chart data.
// (The old rss.applemarketingtools.com host now 301s here.)
const RSS = 'https://rss.marketingtools.apple.com/api/v2/us';

const HOUR = 60 * 60 * 1000;

const fetchFeed = async (path) => {
  const { data } = await getWithRetry(`${RSS}/${path}`, { timeout: 15000 });
  return data?.feed?.results || [];
};

// Top songs, hydrated through iTunes /lookup so every entry carries a
// previewUrl + duration and matches our Track shape.
export const getTrendingSongs = (limit = 25) =>
  cached(`trending-songs-${limit}`, HOUR, async () => {
    const entries = await fetchFeed(`music/most-played/${limit}/songs.json`);
    const ids = entries.map((e) => e.id).filter(Boolean);
    const tracks = await getTracksByIds(ids);
    // Preserve chart order
    const byId = new Map(tracks.map((t) => [t.spotifyId, t]));
    return ids.map((id) => byId.get(String(id))).filter(Boolean);
  });

export const getTopAlbums = (limit = 20) =>
  cached(`top-albums-${limit}`, HOUR, async () => {
    const entries = await fetchFeed(`music/most-played/${limit}/albums.json`);
    return entries.map((e) => ({
      id: String(e.id),
      name: e.name,
      artist: e.artistName,
      artistId: e.artistId ? String(e.artistId) : null,
      image: (e.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
      releaseDate: e.releaseDate || '',
    }));
  });

// Apple retired the dedicated new-releases feed, so derive it: chart songs
// released within the last 120 days, newest first.
export const getNewReleases = (limit = 20) =>
  cached(`new-releases-${limit}`, HOUR, async () => {
    const songs = await getTrendingSongs(50);
    const cutoff = Date.now() - 120 * 24 * HOUR;
    return songs
      .filter((t) => t.releaseDate && new Date(t.releaseDate).getTime() > cutoff)
      .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
      .slice(0, limit);
  });

// Deterministic daily pick from the chart — same song for everyone all day.
export const getSongOfTheDay = () =>
  cached('song-of-the-day', HOUR, async () => {
    const songs = await getTrendingSongs(50);
    if (!songs.length) return null;
    const dayNumber = Math.floor(Date.now() / (24 * HOUR));
    return songs[dayNumber % songs.length];
  });

export const getTopPodcasts = (limit = 20) =>
  cached(`top-podcasts-${limit}`, 6 * HOUR, async () => {
    const entries = await fetchFeed(`podcasts/top/${limit}/podcasts.json`);
    return entries.map((e) => ({
      id: String(e.id),
      name: e.name,
      publisher: e.artistName,
      image: (e.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
      genres: (e.genres || []).map((g) => g.name).filter((n) => n && n !== 'Podcasts'),
    }));
  });
