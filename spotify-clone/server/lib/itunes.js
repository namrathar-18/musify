import axios from 'axios';

// Catalog data source: Apple's iTunes Search API.
// It is free, requires no auth/keys, is reliable from cloud (serverless) IPs,
// returns real 30s preview URLs, and gives duration in milliseconds already.
// Docs: https://performance-partners.apple.com/search-api
const API = 'https://itunes.apple.com';

// iTunes artwork URLs are 100x100 by default; bump to a crisper 300x300.
const hiResArt = (url) =>
  url ? url.replace('100x100bb', '300x300bb').replace('/100x100', '/300x300') : '';

// Normalize an iTunes "song" result into our Track schema shape.
// (The id field is named `spotifyId` for legacy/compat reasons across the app;
// it simply holds the external catalog id — here, the iTunes trackId.)
export const normalizeTrack = (t) => ({
  spotifyId: String(t.trackId),
  title: t.trackName || '',
  artist: t.artistName || '',
  artistId: t.artistId ? String(t.artistId) : '',
  album: t.collectionName || '',
  albumId: t.collectionId ? String(t.collectionId) : '',
  albumArt: hiResArt(t.artworkUrl100 || ''),
  previewUrl: t.previewUrl || '',
  duration: t.trackTimeMillis || 0, // already milliseconds
  genre: t.primaryGenreName || '',
  releaseDate: (t.releaseDate || '').slice(0, 10),
});

// Apple endpoints occasionally cold-time-out on the first hit; retry once.
export const getWithRetry = async (url, config, retries = 1) => {
  try {
    return await axios.get(url, { timeout: 20000, ...config });
  } catch (err) {
    if (retries > 0) return getWithRetry(url, config, retries - 1);
    throw err;
  }
};

const searchRaw = async (params) => {
  const { data } = await getWithRetry(`${API}/search`, {
    params: { media: 'music', entity: 'song', country: 'US', ...params },
  });
  return data.results || [];
};

// Generic track search used by the seed script. iTunes has no offset param, so
// we over-fetch (capped at 200) and slice to emulate pagination.
export const searchTracksForSeed = async (query, limit = 50, offset = 0) => {
  const results = await searchRaw({ term: query, limit: Math.min(offset + limit, 200) });
  return results.slice(offset, offset + limit);
};

// Rich search for GET /api/search — returns normalized tracks plus albums and
// artists derived (de-duplicated) from the same song results, so one upstream
// call powers all three sections with artwork.
export const searchCatalog = async (q, limit = 25) => {
  const results = await searchRaw({ term: q, limit });
  const tracks = results.map(normalizeTrack);

  const albums = new Map();
  const artists = new Map();
  for (const r of results) {
    if (r.collectionId && !albums.has(r.collectionId)) {
      albums.set(r.collectionId, {
        id: String(r.collectionId),
        name: r.collectionName || '',
        artist: r.artistName || '',
        image: hiResArt(r.artworkUrl100 || ''),
        releaseDate: (r.releaseDate || '').slice(0, 10),
      });
    }
    if (r.artistName && !artists.has(r.artistName)) {
      artists.set(r.artistName, {
        id: String(r.artistId || r.artistName),
        name: r.artistName,
        image: hiResArt(r.artworkUrl100 || ''),
        followers: 0,
        genres: r.primaryGenreName ? [r.primaryGenreName] : [],
      });
    }
  }

  return {
    tracks,
    artists: [...artists.values()].slice(0, 6),
    albums: [...albums.values()].slice(0, 12),
  };
};

// Hydrate tracks by id (used for playlist/liked/recent cache misses).
// iTunes /lookup accepts a comma-separated id list, so a batch is one call.
export const getTracksByIds = async (ids) => {
  if (!ids.length) return [];
  const { data } = await axios.get(`${API}/lookup`, {
    params: { id: ids.join(','), entity: 'song' },
    timeout: 15000,
  });
  return (data.results || [])
    .filter((r) => r.wrapperType === 'track' || r.kind === 'song')
    .map(normalizeTrack);
};

// Single track by id (cache-miss fallback for GET /api/songs/:id).
export const getTrackById = async (id) => {
  const [track] = await getTracksByIds([id]);
  if (!track) {
    const err = new Error('Track not found');
    err.status = 404;
    throw err;
  }
  return track;
};

const notFound = (what) => {
  const err = new Error(`${what} not found`);
  err.status = 404;
  return err;
};

// Apple ids are numeric; reject anything else before it hits the API as a 400.
const assertNumericId = (id, what) => {
  if (!/^\d+$/.test(String(id))) throw notFound(what);
};

// Artist page: profile + top songs + albums, in two /lookup calls.
export const getArtistWithContent = async (artistId) => {
  assertNumericId(artistId, 'Artist');
  const [songsRes, albumsRes] = await Promise.all([
    getWithRetry(`${API}/lookup`, { params: { id: artistId, entity: 'song', limit: 25 } }),
    getWithRetry(`${API}/lookup`, { params: { id: artistId, entity: 'album', limit: 20 } }),
  ]);

  const songResults = songsRes.data.results || [];
  const albumResults = albumsRes.data.results || [];
  const profile = songResults.find((r) => r.wrapperType === 'artist') ||
    albumResults.find((r) => r.wrapperType === 'artist');
  if (!profile) throw notFound('Artist');

  const topSongs = songResults
    .filter((r) => r.wrapperType === 'track' || r.kind === 'song')
    .map(normalizeTrack);

  const albums = albumResults
    .filter((r) => r.wrapperType === 'collection')
    .map((al) => ({
      id: String(al.collectionId),
      name: al.collectionName || '',
      artist: al.artistName || '',
      image: hiResArt(al.artworkUrl100 || ''),
      releaseDate: (al.releaseDate || '').slice(0, 10),
      trackCount: al.trackCount || 0,
    }));

  return {
    artist: {
      id: String(profile.artistId),
      name: profile.artistName || '',
      genre: profile.primaryGenreName || '',
      // Artist lookups carry no artwork; borrow the latest album's art.
      image: albums[0]?.image || topSongs[0]?.albumArt || '',
    },
    topSongs,
    albums,
  };
};

// Album page: collection info + full track list, one /lookup call.
export const getAlbumWithTracks = async (albumId) => {
  assertNumericId(albumId, 'Album');
  const { data } = await getWithRetry(`${API}/lookup`, {
    params: { id: albumId, entity: 'song', limit: 200 },
  });
  const results = data.results || [];
  const info = results.find((r) => r.wrapperType === 'collection');
  if (!info) throw notFound('Album');

  const tracks = results
    .filter((r) => r.wrapperType === 'track' || r.kind === 'song')
    .map(normalizeTrack);

  return {
    album: {
      id: String(info.collectionId),
      name: info.collectionName || '',
      artist: info.artistName || '',
      artistId: info.artistId ? String(info.artistId) : '',
      image: hiResArt(info.artworkUrl100 || ''),
      genre: info.primaryGenreName || '',
      releaseDate: (info.releaseDate || '').slice(0, 10),
      trackCount: info.trackCount || tracks.length,
    },
    tracks,
  };
};

const normalizePodcast = (p) => ({
  id: String(p.collectionId),
  name: p.collectionName || '',
  publisher: p.artistName || '',
  image: hiResArt(p.artworkUrl100 || ''),
  genres: (p.genres || []).filter((g) => g !== 'Podcasts'),
  feedUrl: p.feedUrl || '',
  episodeCount: p.trackCount || 0,
  description: '',
});

export const searchPodcasts = async (q, limit = 20) => {
  const { data } = await getWithRetry(`${API}/search`, {
    params: { term: q, media: 'podcast', entity: 'podcast', country: 'US', limit },
  });
  return (data.results || []).map(normalizePodcast);
};

// Podcast show by id — returns feedUrl needed to load episodes.
export const getPodcastById = async (id) => {
  assertNumericId(id, 'Podcast');
  const { data } = await getWithRetry(`${API}/lookup`, { params: { id } });
  const show = (data.results || []).find((r) => r.kind === 'podcast');
  if (!show) throw notFound('Podcast');
  return normalizePodcast(show);
};
