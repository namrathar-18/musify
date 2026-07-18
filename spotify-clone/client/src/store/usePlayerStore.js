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

const shuffleFrom = (length, current) => {
  // Order of remaining indices, current first — Fisher–Yates on the rest
  const rest = Array.from({ length }, (_, i) => i).filter((i) => i !== current);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [current, ...rest];
};

export const usePlayerStore = create((set, get) => ({
  currentTrack: null,
  queue: [],
  index: -1,
  isPlaying: false,
  progress: 0, // seconds
  duration: 0, // seconds
  volume: 0.7,
  authed: false,

  // v2 controls
  shuffle: false,
  shuffleOrder: [], // queue indices in play order when shuffling
  repeat: 'off', // 'off' | 'all' | 'one'
  rate: 1,
  sleepAt: null, // epoch ms when playback should stop
  queueOpen: false,
  fullscreen: false,

  setAuthed: (v) => set({ authed: v }),
  setQueueOpen: (v) => set({ queueOpen: v }),
  setFullscreen: (v) => set({ fullscreen: v }),

  initAudio: () => {
    const a = getAudio();
    a.volume = get().volume;

    a.ontimeupdate = () => {
      const { sleepAt } = get();
      if (sleepAt && Date.now() >= sleepAt) {
        a.pause();
        set({ sleepAt: null });
        return;
      }
      set({ progress: a.currentTime });
    };
    a.onloadedmetadata = () => set({ duration: a.duration || 30 });
    a.onended = () => get()._advance();
    a.onplay = () => set({ isPlaying: true });
    a.onpause = () => set({ isPlaying: false });
    a.onerror = () => set({ isPlaying: false });
  },

  playQueue: async (tracks, startIndex = 0) => {
    if (!tracks?.length) return;
    const shuffle = get().shuffle;
    set({
      queue: tracks,
      index: startIndex,
      shuffleOrder: shuffle ? shuffleFrom(tracks.length, startIndex) : [],
    });
    await get()._playAt(startIndex);
  },

  addToQueue: (track) => {
    const { queue, index, shuffle, shuffleOrder } = get();
    if (queue.some((t) => t.spotifyId === track.spotifyId)) return;
    const next = [...queue, track];
    set({
      queue: next,
      shuffleOrder: shuffle ? [...shuffleOrder, next.length - 1] : shuffleOrder,
    });
    if (index === -1) get().playQueue(next, 0);
  },

  removeFromQueue: (queueIndex) => {
    const { queue, index } = get();
    if (queueIndex === index) return; // don't remove the playing track
    const next = queue.filter((_, i) => i !== queueIndex);
    const newIndex = queueIndex < index ? index - 1 : index;
    const { shuffle } = get();
    set({
      queue: next,
      index: newIndex,
      shuffleOrder: shuffle ? shuffleFrom(next.length, newIndex) : [],
    });
  },

  toggleShuffle: () => {
    const { shuffle, queue, index } = get();
    set({
      shuffle: !shuffle,
      shuffleOrder: !shuffle && queue.length ? shuffleFrom(queue.length, index) : [],
    });
  },

  cycleRepeat: () => {
    const order = { off: 'all', all: 'one', one: 'off' };
    set({ repeat: order[get().repeat] });
  },

  setRate: (rate) => {
    const a = getAudio();
    a.playbackRate = rate;
    set({ rate });
  },

  // minutes from now; null clears
  setSleepTimer: (minutes) =>
    set({ sleepAt: minutes ? Date.now() + minutes * 60000 : null }),

  _playAt: async (i) => {
    const { queue, authed, rate } = get();
    if (i < 0 || i >= queue.length) return;
    const track = queue[i];
    const a = getAudio();

    set({ currentTrack: track, index: i, progress: 0 });

    if (!track.previewUrl) {
      a.pause();
      set({ isPlaying: false });
      return;
    }

    a.src = track.previewUrl;
    a.playbackRate = rate;
    try {
      await a.play();
    } catch {
      // Autoplay may be blocked before first interaction
      set({ isPlaying: false });
    }

    // Music plays feed the stats log; podcast episodes don't (music-only stats)
    if (authed && !track.isEpisode) {
      recordPlay(track.spotifyId).catch(() => {});
    }
  },

  // What plays after the current track ends (repeat/shuffle aware)
  _advance: () => {
    const { repeat, index } = get();
    if (repeat === 'one') {
      get()._playAt(index);
      return;
    }
    get().next();
  },

  _neighbor: (dir) => {
    const { queue, index, shuffle, shuffleOrder, repeat } = get();
    if (!queue.length) return -1;
    if (shuffle && shuffleOrder.length === queue.length) {
      const pos = shuffleOrder.indexOf(index);
      const nextPos = pos + dir;
      if (nextPos >= 0 && nextPos < shuffleOrder.length) return shuffleOrder[nextPos];
      return repeat === 'all' ? shuffleOrder[(nextPos + shuffleOrder.length) % shuffleOrder.length] : -1;
    }
    const nextIdx = index + dir;
    if (nextIdx >= 0 && nextIdx < queue.length) return nextIdx;
    return repeat === 'all' ? (nextIdx + queue.length) % queue.length : -1;
  },

  next: () => {
    const target = get()._neighbor(1);
    if (target !== -1) {
      get()._playAt(target);
    } else {
      const a = getAudio();
      a.pause();
      a.currentTime = 0;
      set({ isPlaying: false, progress: 0 });
    }
  },

  prev: () => {
    const a = getAudio();
    // More than 3s in → restart track instead of jumping back
    if (a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    const target = get()._neighbor(-1);
    if (target !== -1) get()._playAt(target);
    else a.currentTime = 0;
  },

  togglePlay: async () => {
    const a = getAudio();
    if (!get().currentTrack) return;
    if (a.paused) {
      try {
        await a.play();
      } catch {}
    } else {
      a.pause();
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
