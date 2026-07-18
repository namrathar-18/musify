import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// We create one axios instance and inject the Clerk token via interceptor.
// The token getter is wired up from App.jsx via setAuthTokenGetter().
let getToken = null;
export const setAuthTokenGetter = (fn) => {
  getToken = fn;
};

export const api = axios.create({ baseURL });

api.interceptors.request.use(async (config) => {
  if (getToken) {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      // Continue without auth; backend will 401 if route requires it
    }
  }
  return config;
});

// Songs
export const fetchSongs = (page = 1, limit = 20) =>
  api.get('/songs', { params: { page, limit } }).then((r) => r.data);

export const fetchSong = (id) => api.get(`/songs/${id}`).then((r) => r.data);

// Search
export const searchAll = (q) =>
  api.get('/search', { params: { q } }).then((r) => r.data);

// Playlists
export const fetchPlaylists = () => api.get('/playlists').then((r) => r.data);
export const fetchPlaylist = (id) =>
  api.get(`/playlists/${id}`).then((r) => r.data);
export const createPlaylist = (name, description = '') =>
  api.post('/playlists', { name, description }).then((r) => r.data);
export const renamePlaylist = (id, name, description) =>
  api.put(`/playlists/${id}`, { name, description }).then((r) => r.data);
export const deletePlaylist = (id) =>
  api.delete(`/playlists/${id}`).then((r) => r.data);
export const addTrackToPlaylist = (id, spotifyTrackId) =>
  api.post(`/playlists/${id}/tracks`, { spotifyTrackId }).then((r) => r.data);
export const removeTrackFromPlaylist = (id, trackId) =>
  api.delete(`/playlists/${id}/tracks/${trackId}`).then((r) => r.data);

// User
export const fetchMe = () => api.get('/users/me').then((r) => r.data);
export const fetchLiked = () => api.get('/users/me/liked').then((r) => r.data);
export const toggleLike = (trackId) =>
  api.post(`/users/me/liked/${trackId}`).then((r) => r.data);
export const fetchRecent = () => api.get('/users/me/recent').then((r) => r.data);
export const recordPlay = (trackId) =>
  api.post(`/users/me/recent/${trackId}`).then((r) => r.data);

// Stats — tz is the client's UTC offset so day/hour buckets are local
const tzOffset = () => {
  const m = -new Date().getTimezoneOffset();
  const sign = m < 0 ? '-' : '+';
  const abs = Math.abs(m);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
};
export const fetchStats = (days = 30) =>
  api.get('/users/me/stats', { params: { days, tz: tzOffset() } }).then((r) => r.data);

// Charts / discovery
export const fetchTrending = () => api.get('/charts/trending').then((r) => r.data);
export const fetchTopAlbums = () => api.get('/charts/top-albums').then((r) => r.data);
export const fetchNewReleases = () => api.get('/charts/new-releases').then((r) => r.data);
export const fetchSongOfTheDay = () => api.get('/charts/song-of-the-day').then((r) => r.data);
export const fetchGenreRow = (genre) =>
  api.get(`/charts/genre/${encodeURIComponent(genre)}`).then((r) => r.data);

// Artists / albums
export const fetchArtist = (id) => api.get(`/artists/${id}`).then((r) => r.data);
export const fetchAlbum = (id) => api.get(`/albums/${id}`).then((r) => r.data);

// Podcasts
export const fetchTopPodcasts = () => api.get('/podcasts/top').then((r) => r.data);
export const searchPodcasts = (q) =>
  api.get('/podcasts/search', { params: { q } }).then((r) => r.data);
export const fetchPodcast = (id) => api.get(`/podcasts/${id}`).then((r) => r.data);

// AI
export const fetchAiStatus = () => api.get('/ai/status').then((r) => r.data);
export const aiChat = (messages) =>
  api.post('/ai/chat', { messages }).then((r) => r.data);
export const aiGeneratePlaylist = (prompt) =>
  api.post('/ai/playlist', { prompt }).then((r) => r.data);
export const aiSearch = (query) =>
  api.post('/ai/search', { query }).then((r) => r.data);
export const aiWeeklyReport = () => api.get('/ai/weekly-report').then((r) => r.data);
