import { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';

// Global media shortcuts. Skipped while the user is typing in an input.
// space play/pause · ←/→ seek 5s · ↑/↓ volume · m mute · s shuffle · r repeat · q queue · f fullscreen · Esc close overlays
export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const s = usePlayerStore.getState();
      switch (e.key) {
        case ' ':
          e.preventDefault();
          s.togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          s.seek(Math.min(s.progress + 5, s.duration || 30));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          s.seek(Math.max(s.progress - 5, 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          s.setVolume(Math.min(s.volume + 0.1, 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          s.setVolume(Math.max(s.volume - 0.1, 0));
          break;
        case 'm':
          s.setVolume(s.volume > 0 ? 0 : 0.7);
          break;
        case 's':
          s.toggleShuffle();
          break;
        case 'r':
          s.cycleRepeat();
          break;
        case 'q':
          s.setQueueOpen(!s.queueOpen);
          break;
        case 'f':
          if (s.currentTrack) s.setFullscreen(!s.fullscreen);
          break;
        case 'Escape':
          s.setFullscreen(false);
          s.setQueueOpen(false);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
};
