import { create } from 'zustand';
import { recordPlay } from '../lib/api';

// Singleton audio element kept outside React tree so it survives route changes.
let audio = null;
const getAudio = () => {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
  }
  return audio;
};

export const usePlayerStore = create((set, get) => ({
  currentTrack: null,
  queue: [],
  index: -1,
  isPlaying: false,
  progress: 0, // seconds
  duration: 0, // seconds (preview is ~30)
  volume: 0.7,
  authed: false,

  setAuthed: (v) => set({ authed: v }),

  initAudio: () => {
    const a = getAudio();
    a.volume = get().volume;

    a.ontimeupdate = () => set({ progress: a.currentTime });
    a.onloadedmetadata = () => set({ duration: a.duration || 30 });
    a.onended = () => get().next();
    a.onplay = () => set({ isPlaying: true });
    a.onpause = () => set({ isPlaying: false });
    a.onerror = () => set({ isPlaying: false });
  },

  playQueue: async (tracks, startIndex = 0) => {
    if (!tracks?.length) return;
    set({ queue: tracks, index: startIndex });
    await get()._playAt(startIndex);
  },

  _playAt: async (i) => {
    const { queue, authed } = get();
    if (i < 0 || i >= queue.length) return;
    const track = queue[i];
    const a = getAudio();

    set({ currentTrack: track, index: i, progress: 0 });

    if (!track.previewUrl) {
      // No preview available — keep the track displayed but don't try to play
      a.pause();
      set({ isPlaying: false });
      return;
    }

    a.src = track.previewUrl;
    try {
      await a.play();
    } catch (e) {
      // Autoplay might be blocked on first interaction; we leave state intact
      set({ isPlaying: false });
    }

    // Record play (fire-and-forget; needs auth)
    if (authed) {
      recordPlay(track.spotifyId).catch(() => {});
    }
  },

  togglePlay: async () => {
    const a = getAudio();
    const { currentTrack } = get();
    if (!currentTrack) return;
    if (a.paused) {
      try {
        await a.play();
      } catch (e) {}
    } else {
      a.pause();
    }
  },

  next: () => {
    const { index, queue } = get();
    if (index + 1 < queue.length) {
      get()._playAt(index + 1);
    } else {
      const a = getAudio();
      a.pause();
      a.currentTime = 0;
      set({ isPlaying: false, progress: 0 });
    }
  },

  prev: () => {
    const a = getAudio();
    // If we're more than 3s in, restart the track; otherwise go to previous
    if (a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    const { index } = get();
    if (index > 0) {
      get()._playAt(index - 1);
    } else {
      a.currentTime = 0;
    }
  },

  seek: (seconds) => {
    const a = getAudio();
    if (Number.isFinite(seconds)) {
      a.currentTime = seconds;
      set({ progress: seconds });
    }
  },

  setVolume: (v) => {
    const a = getAudio();
    a.volume = v;
    set({ volume: v });
  },
}));
