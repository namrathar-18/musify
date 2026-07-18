import { Play, Pause } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

// Square artwork card used in horizontal home rows.
export default function TrackCard({ track, queue, index }) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const isCurrent = currentTrack?.spotifyId === track.spotifyId;
  const showPause = isCurrent && isPlaying;

  const handlePlay = () => {
    if (isCurrent) togglePlay();
    else playQueue(queue || [track], queue ? index : 0);
  };

  return (
    <div className="w-40 shrink-0 group">
      <div className="relative w-40 h-40 rounded-lg overflow-hidden bg-surface-800 shadow-lg">
        {track.albumArt && (
          <img
            src={track.albumArt}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        <button
          onClick={handlePlay}
          aria-label={showPause ? `Pause ${track.title}` : `Play ${track.title}`}
          className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-accent-deep text-white shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 ${
            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0'
          }`}
        >
          {showPause ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
      </div>
      <div
        className={`mt-2 font-semibold text-sm truncate ${isCurrent ? 'text-accent' : ''}`}
        title={track.title}
      >
        {track.title}
      </div>
      <div className="text-muted text-xs truncate">{track.artist}</div>
    </div>
  );
}
