import { create } from 'zustand';
import * as apiClient from '../lib/api';

export const useLibraryStore = create((set, get) => ({
  playlists: [],
  likedIds: new Set(),
  loaded: false,
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [playlistsRes, meRes] = await Promise.all([
        apiClient.fetchPlaylists(),
        apiClient.fetchMe(),
      ]);
      set({
        playlists: playlistsRes.items || [],
        likedIds: new Set(meRes.likedSongIds || []),
        loaded: true,
        loading: false,
      });
    } catch (err) {
      set({
        error: err.response?.data?.error || err.message,
        loading: false,
      });
    }
  },

  createPlaylist: async (name) => {
    const p = await apiClient.createPlaylist(name);
    set({ playlists: [p, ...get().playlists] });
    return p;
  },

  renamePlaylist: async (id, name) => {
    const p = await apiClient.renamePlaylist(id, name);
    set({
      playlists: get().playlists.map((pl) => (pl._id === id ? p : pl)),
    });
    return p;
  },

  deletePlaylist: async (id) => {
    await apiClient.deletePlaylist(id);
    set({ playlists: get().playlists.filter((pl) => pl._id !== id) });
  },

  addTrackToPlaylist: async (id, spotifyTrackId) => {
    const p = await apiClient.addTrackToPlaylist(id, spotifyTrackId);
    set({
      playlists: get().playlists.map((pl) => (pl._id === id ? p : pl)),
    });
    return p;
  },

  removeTrackFromPlaylist: async (id, trackId) => {
    const p = await apiClient.removeTrackFromPlaylist(id, trackId);
    set({
      playlists: get().playlists.map((pl) => (pl._id === id ? p : pl)),
    });
    return p;
  },

  toggleLike: async (trackId) => {
    const res = await apiClient.toggleLike(trackId);
    set({ likedIds: new Set(res.likedSongs) });
    return res.liked;
  },

  isLiked: (trackId) => get().likedIds.has(trackId),
}));
