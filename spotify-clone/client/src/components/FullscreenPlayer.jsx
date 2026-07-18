import { X, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Heart } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useUser } from '@clerk/clerk-react';
import { formatTime } from './Player';

export default function FullscreenPlayer() {
  const { isSignedIn } = useUser();
  const fullscreen = usePlayerStore((s) => s.fullscreen);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const setFullscreen = usePlayerStore((s) => s.setFullscreen);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);

  const isLiked = useLibraryStore((s) =>
    currentTrack ? s.likedIds.has(currentTrack.spotifyId) : false
  );
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  if (!fullscreen || !currentTrack) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-gradient-to-b from-accent-deep/40 via-surface-950 to-surface-950 backdrop-blur flex flex-col items-center justify-center p-6"
      role="dialog"
      aria-label="Fullscreen player"
    >
      <button
        onClick={() => setFullscreen(false)}
        className="absolute top-5 right-5 p-2 text-muted hover:text-white"
        aria-label="Close fullscreen player"
      >
        <X size={22} />
      </button>

      {currentTrack.albumArt && (
        <img
          src={currentTrack.albumArt}
          alt=""
          className="w-64 h-64 md:w-80 md:h-80 rounded-2xl shadow-2xl object-cover"
        />
      )}

      <div className="text-center mt-8 max-w-lg px-4">
        <div className="flex items-center justify-center gap-3">
          <h2 className="text-2xl md:text-3xl font-bold truncate">{currentTrack.title}</h2>
          {isSignedIn && !currentTrack.isEpisode && (
            <button
              onClick={() => toggleLike(currentTrack.spotifyId).catch(() => {})}
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart size={22} className={isLiked ? 'fill-accent text-accent' : 'text-muted hover:text-white'} />
            </button>
          )}
        </div>
        <p className="text-muted mt-1 truncate">{currentTrack.artist}</p>
      </div>

      <div className="flex items-center gap-2 w-full max-w-md mt-6">
        <span className="text-xs text-muted w-10 text-right">{formatTime(progress)}</span>
        <input
          type="range"
          min={0}
          max={duration || 30}
          step={0.1}
          value={Math.min(progress, duration || 30)}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="flex-1"
          aria-label="Seek"
        />
        <span className="text-xs text-muted w-10">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center gap-6 mt-6">
        <button
          onClick={toggleShuffle}
          className={shuffle ? 'text-accent' : 'text-muted hover:text-white'}
          aria-pressed={shuffle}
          aria-label="Toggle shuffle"
        >
          <Shuffle size={20} />
        </button>
        <button onClick={prev} className="text-muted hover:text-white" aria-label="Previous">
          <SkipBack size={26} />
        </button>
        <button
          onClick={togglePlay}
          className="bg-white rounded-full w-14 h-14 flex items-center justify-center text-black hover:scale-105 transition-transform"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={26} /> : <Play size={26} className="ml-1" />}
        </button>
        <button onClick={next} className="text-muted hover:text-white" aria-label="Next">
          <SkipForward size={26} />
        </button>
        <button
          onClick={cycleRepeat}
          className={repeat !== 'off' ? 'text-accent' : 'text-muted hover:text-white'}
          aria-label={`Repeat: ${repeat}`}
        >
          {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
        </button>
      </div>
    </div>
  );
}
