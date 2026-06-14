import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPlaylist } from '../lib/api';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import TrackRow from '../components/TrackRow';
import { Loader2, Play, Pencil, Trash2 } from 'lucide-react';

export default function PlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const renamePlaylist = useLibraryStore((s) => s.renamePlaylist);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);
  const removeTrack = useLibraryStore((s) => s.removeTrackFromPlaylist);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const load = () => {
    setLoading(true);
    fetchPlaylist(id)
      .then((data) => {
        setPlaylist(data);
        setName(data.name);
      })
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleRename = async () => {
    if (!name.trim() || name === playlist.name) {
      setEditing(false);
      return;
    }
    await renamePlaylist(id, name.trim());
    setPlaylist({ ...playlist, name: name.trim() });
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this playlist?')) return;
    await deletePlaylist(id);
    navigate('/library');
  };

  const handleRemoveTrack = async (track) => {
    await removeTrack(id, track.spotifyId);
    setPlaylist({
      ...playlist,
      tracks: playlist.tracks.filter((t) => t.spotifyId !== track.spotifyId),
    });
  };

  if (loading)
    return (
      <div className="flex items-center text-spotify-light">
        <Loader2 className="animate-spin mr-2" /> Loading…
      </div>
    );
  if (error) return <div className="text-red-400">{error}</div>;
  if (!playlist) return null;

  const tracks = playlist.tracks || [];

  return (
    <div>
      <div className="flex items-end gap-6 mb-8">
        <div className="w-48 h-48 rounded bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-spotify-light mb-2">
            Playlist
          </div>
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
              className="text-5xl font-bold bg-transparent border-b border-white/30 focus:outline-none focus:border-white w-full"
            />
          ) : (
            <h1 className="text-5xl font-bold truncate">{playlist.name}</h1>
          )}
          <div className="text-spotify-light text-sm mt-3">
            {tracks.length} tracks
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => playQueue(tracks, 0)}
          disabled={tracks.length === 0}
          className="bg-spotify-green hover:bg-green-500 text-black rounded-full w-14 h-14 flex items-center justify-center disabled:opacity-40 hover:scale-105 transition-transform"
        >
          <Play size={24} className="ml-1 fill-black" />
        </button>
        <button
          onClick={() => setEditing(true)}
          className="p-2 text-spotify-light hover:text-white"
          title="Rename"
        >
          <Pencil size={20} />
        </button>
        <button
          onClick={handleDelete}
          className="p-2 text-spotify-light hover:text-red-400"
          title="Delete playlist"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="text-spotify-light text-center py-12">
          This playlist is empty. Add tracks from the catalog or search.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[2rem,1fr,1fr,4rem,auto] gap-4 px-4 pb-2 border-b border-white/10 text-xs uppercase tracking-wider text-spotify-light">
            <div>#</div>
            <div>Title</div>
            <div>Album</div>
            <div>Time</div>
            <div></div>
          </div>
          <div className="mt-2">
            {tracks.map((t, i) => (
              <TrackRow
                key={t.spotifyId}
                track={t}
                index={i}
                queue={tracks}
                onRemove={handleRemoveTrack}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
