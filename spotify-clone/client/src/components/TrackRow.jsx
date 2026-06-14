import { Play, Pause, Heart, Plus, Trash2 } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useUser } from '@clerk/clerk-react';
import { useState } from 'react';

const formatMs = (ms) => {
  if (!ms) return '';
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function TrackRow({
  track,
  index,
  queue,
  onRemove, // optional - shown if provided
}) {
  const { isSignedIn } = useUser();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const playlists = useLibraryStore((s) => s.playlists);
  const addToPlaylist = useLibraryStore((s) => s.addTrackToPlaylist);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const isLiked = useLibraryStore((s) => s.likedIds.has(track.spotifyId));

  const [showAdd, setShowAdd] = useState(false);

  const isCurrent = currentTrack?.spotifyId === track.spotifyId;
  const showPause = isCurrent && isPlaying;

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playQueue(queue || [track], queue ? index || 0 : 0);
    }
  };

  return (
    <div className="grid grid-cols-[2rem,1fr,1fr,4rem,auto] gap-4 items-center px-4 py-2 rounded hover:bg-white/5 group">
      <button
        onClick={handlePlay}
        className="text-spotify-light hover:text-white flex items-center justify-center"
        disabled={!track.previewUrl}
        title={!track.previewUrl ? 'No preview available' : 'Play'}
      >
        <span className="group-hover:hidden">{(index ?? 0) + 1}</span>
        <span className="hidden group-hover:inline">
          {showPause ? <Pause size={16} /> : <Play size={16} />}
        </span>
      </button>

      <div className="flex items-center gap-3 min-w-0">
        {track.albumArt && (
          <img src={track.albumArt} alt="" className="w-10 h-10 rounded shrink-0" />
        )}
        <div className="min-w-0">
          <div
            className={`truncate font-medium ${
              isCurrent ? 'text-spotify-green' : 'text-white'
            }`}
          >
            {track.title}
          </div>
          <div className="text-spotify-light text-sm truncate">{track.artist}</div>
        </div>
      </div>

      <div className="text-spotify-light text-sm truncate">{track.album}</div>

      <div className="text-spotify-light text-sm">{formatMs(track.duration)}</div>

      <div className="flex items-center gap-2 relative">
        {isSignedIn && (
          <button
            onClick={() => toggleLike(track.spotifyId).catch(() => {})}
            className="p-1 text-spotify-light hover:text-white"
            title={isLiked ? 'Remove from liked' : 'Add to liked'}
          >
            <Heart
              size={16}
              className={isLiked ? 'fill-spotify-green text-spotify-green' : ''}
            />
          </button>
        )}
        {isSignedIn && playlists.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="p-1 text-spotify-light hover:text-white"
              title="Add to playlist"
            >
              <Plus size={16} />
            </button>
            {showAdd && (
              <div className="absolute right-0 top-full mt-1 bg-spotify-gray rounded-md shadow-lg py-1 min-w-[180px] z-20 max-h-60 overflow-y-auto">
                {playlists.map((p) => (
                  <button
                    key={p._id}
                    onClick={async () => {
                      await addToPlaylist(p._id, track.spotifyId).catch(() => {});
                      setShowAdd(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 truncate"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(track)}
            className="p-1 text-spotify-light hover:text-red-400"
            title="Remove"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
