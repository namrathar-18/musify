import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useUser } from '@clerk/clerk-react';

const formatTime = (s) => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export default function Player() {
  const { isSignedIn } = useUser();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const setVolume = usePlayerStore((s) => s.setVolume);

  const isLiked = useLibraryStore((s) =>
    currentTrack ? s.likedIds.has(currentTrack.spotifyId) : false
  );
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  if (!currentTrack) {
    return (
      <div className="h-20 bg-black border-t border-white/10 flex items-center justify-center text-spotify-light text-sm">
        Pick a track to start playing
      </div>
    );
  }

  const noPreview = !currentTrack.previewUrl;

  return (
    <div className="h-20 bg-black border-t border-white/10 px-4 grid grid-cols-3 items-center">
      {/* Left: track info */}
      <div className="flex items-center gap-3 min-w-0">
        {currentTrack.albumArt && (
          <img
            src={currentTrack.albumArt}
            alt=""
            className="w-14 h-14 rounded shrink-0"
          />
        )}
        <div className="min-w-0">
          <div className="font-semibold truncate">{currentTrack.title}</div>
          <div className="text-spotify-light text-sm truncate">
            {currentTrack.artist}
          </div>
        </div>
        {isSignedIn && (
          <button
            onClick={() => toggleLike(currentTrack.spotifyId).catch(() => {})}
            className="ml-2 p-2 hover:scale-105 transition-transform"
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart
              size={18}
              className={isLiked ? 'fill-spotify-green text-spotify-green' : 'text-spotify-light'}
            />
          </button>
        )}
      </div>

      {/* Middle: controls */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-4">
          <button onClick={prev} className="text-spotify-light hover:text-white">
            <SkipBack size={20} />
          </button>
          <button
            onClick={togglePlay}
            disabled={noPreview}
            className="bg-white rounded-full w-9 h-9 flex items-center justify-center text-black hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
            title={noPreview ? 'No preview available for this track' : isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>
          <button onClick={next} className="text-spotify-light hover:text-white">
            <SkipForward size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2 w-full max-w-md">
          <span className="text-xs text-spotify-light w-9 text-right">
            {formatTime(progress)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 30}
            step={0.1}
            value={Math.min(progress, duration || 30)}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="flex-1"
            disabled={noPreview}
          />
          <span className="text-xs text-spotify-light w-9">
            {formatTime(duration)}
          </span>
        </div>
        {noPreview && (
          <div className="text-[10px] text-amber-400">
            No 30s preview available for this track
          </div>
        )}
      </div>

      {/* Right: volume */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
          className="text-spotify-light hover:text-white"
        >
          {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-28"
        />
      </div>
    </div>
  );
}
