import axios from 'axios';

// Cached client-credentials access token
let tokenCache = { token: null, expiresAt: 0 };

const getAccessToken = async () => {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials are not configured');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const { data } = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return tokenCache.token;
};

const spotifyGet = async (path, params = {}) => {
  const token = await getAccessToken();
  const { data } = await axios.get(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return data;
};

// Normalize a Spotify track object into our schema shape
export const normalizeTrack = (t) => ({
  spotifyId: t.id,
  title: t.name,
  artist: (t.artists || []).map((a) => a.name).join(', '),
  album: t.album?.name || '',
  albumArt: t.album?.images?.[0]?.url || '',
  previewUrl: t.preview_url || '',
  duration: t.duration_ms || 0,
});

export const searchSpotify = async (q, type = 'track', limit = 20) => {
  const data = await spotifyGet('/search', { q, type, limit });
  return data;
};

export const getTrack = async (id) => {
  const data = await spotifyGet(`/tracks/${id}`);
  return data;
};

export const getSeveralTracks = async (ids) => {
  if (!ids.length) return { tracks: [] };
  const data = await spotifyGet('/tracks', { ids: ids.join(',') });
  return data;
};

// Used for the initial catalog seed — pulls multiple featured/popular playlists
export const getPlaylistTracks = async (playlistId, limit = 100) => {
  const data = await spotifyGet(`/playlists/${playlistId}/tracks`, { limit });
  return data;
};

// Pull a category's playlists; useful to seed a catalog
export const getCategoryPlaylists = async (categoryId, limit = 20) => {
  const data = await spotifyGet(`/browse/categories/${categoryId}/playlists`, { limit });
  return data;
};

// Search-based catalog seed (more robust than browse endpoints which Spotify
// has been restricting). We do several genre queries to gather 500+ tracks.
export const searchTracksForSeed = async (query, limit = 50, offset = 0) => {
  const data = await spotifyGet('/search', {
    q: query,
    type: 'track',
    limit,
    offset,
  });
  return data.tracks?.items || [];
};
