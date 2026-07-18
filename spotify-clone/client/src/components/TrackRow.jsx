import { Play, Pause, Heart, Plus, Trash2, ListPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { toast } from '../store/useToastStore';
import { useUser } from '@clerk/clerk-react';
import { useState } from 'react';

const formatMs = (ms) => {
  if (!ms) return '';
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
};

export default function TrackRow({
  track,
  index,
  queue,
  onRemove, // optional — shown if provided
}) {
  const { isSignedIn } = useUser();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const playlists = useLibraryStore((s) => s.playlists);
  const addToPlaylist = useLibraryStore((s) => s.addTrackToPlaylist);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const isLiked = useLibraryStore((s) => s.likedIds.has(track.spotifyId));

  const [showAdd, setShowAdd] = useState(false);

  const isCurrent = currentTrack?.spotifyId === track.spotifyId;
  const showPause = isCurrent && isPlaying;
  const isEpisode = !!track.isEpisode;

  const handlePlay = () => {
    if (isCurrent) togglePlay();
    else playQueue(queue || [track], queue ? index || 0 : 0);
  };

  return (
    <div className="grid grid-cols-[2rem,1fr,3.5rem,auto] md:grid-cols-[2rem,1fr,1fr,4rem,auto] gap-3 md:gap-4 items-center px-2 md:px-4 py-2 rounded-md hover:bg-white/5 group transition-colors">
      <button
        onClick={handlePlay}
        className="text-muted hover:text-white flex items-center justify-center"
        disabled={!track.previewUrl}
        aria-label={showPause ? 'Pause' : `Play ${track.title}`}
        title={!track.previewUrl ? 'No preview available' : showPause ? 'Pause' : 'Play'}
      >
        <span className="group-hover:hidden text-sm">{(index ?? 0) + 1}</span>
        <span className="hidden group-hover:inline">
          {showPause ? <Pause size={16} /> : <Play size={16} />}
        </span>
      </button>

      <div className="flex items-center gap-3 min-w-0">
        {track.albumArt && (
          <img src={track.albumArt} alt="" loading="lazy" className="w-10 h-10 rounded shrink-0" />
        )}
        <div className="min-w-0">
          <div
            className={`truncate font-medium text-sm md:text-base ${
              isCurrent ? 'text-accent' : 'text-white'
            }`}
          >
            {track.title}
          </div>
          {track.artistId && !isEpisode ? (
            <Link
              to={`/artist/${track.artistId}`}
              className="text-muted text-xs md:text-sm truncate block hover:text-white hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {track.artist}
            </Link>
          ) : (
            <div className="text-muted text-xs md:text-sm truncate">{track.artist}</div>
          )}
        </div>
      </div>

      <div className="text-muted text-sm truncate hidden md:block">
        {track.albumId && !isEpisode ? (
          <Link to={`/album/${track.albumId}`} className="hover:text-white hover:underline">
            {track.album}
          </Link>
        ) : (
          track.album
        )}
      </div>

      <div className="text-muted text-xs md:text-sm">{formatMs(track.duration)}</div>

      <div className="flex items-center gap-1 md:gap-2 relative">
        {isSignedIn && !isEpisode && (
          <button
            onClick={async () => {
              try {
                const liked = await toggleLike(track.spotifyId);
                toast(liked ? 'Added to Liked Songs' : 'Removed from Liked Songs', 'success');
              } catch {
                toast('Could not update like', 'error');
              }
            }}
            className="p-1 text-muted hover:text-white"
            aria-label={isLiked ? 'Remove from liked' : 'Add to liked'}
            title={isLiked ? 'Remove from liked' : 'Add to liked'}
          >
            <Heart size={16} className={isLiked ? 'fill-accent text-accent' : ''} />
          </button>
        )}
        <button
          onClick={() => {
            addToQueue(track);
            toast('Added to queue', 'success');
          }}
          className="p-1 text-muted hover:text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          aria-label="Add to queue"
          title="Add to queue"
        >
          <ListPlus size={16} />
        </button>
        {isSignedIn && !isEpisode && playlists.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="p-1 text-muted hover:text-white"
              aria-label="Add to playlist"
              title="Add to playlist"
            >
              <Plus size={16} />
            </button>
            {showAdd && (
              <div className="absolute right-0 top-full mt-1 bg-surface-700 border border-white/10 rounded-lg shadow-xl py-1 min-w-[180px] z-20 max-h-60 overflow-y-auto">
                {playlists.map((p) => (
                  <button
                    key={p._id}
                    onClick={async () => {
                      try {
                        await addToPlaylist(p._id, track.spotifyId);
                        toast(`Added to ${p.name}`, 'success');
                      } catch {
                        toast('Could not add to playlist', 'error');
                      }
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
            className="p-1 text-muted hover:text-red-400"
            aria-label="Remove"
            title="Remove"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
