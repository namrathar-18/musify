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
