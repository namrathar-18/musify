import { useLibraryStore } from '../store/useLibraryStore';
import PlaylistCard from '../components/PlaylistCard';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Library() {
  const playlists = useLibraryStore((s) => s.playlists);
  const loading = useLibraryStore((s) => s.loading);
  const error = useLibraryStore((s) => s.error);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const p = await createPlaylist(`My Playlist #${playlists.length + 1}`);
      navigate(`/playlist/${p._id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Your Library</h2>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="bg-white text-black font-semibold px-4 py-2 rounded-full hover:scale-105 transition-transform disabled:opacity-40"
        >
          New playlist
        </button>
      </div>

      {loading && <div className="text-spotify-light">Loading…</div>}
      {error && <div className="text-red-400">{error}</div>}

      {!loading && playlists.length === 0 && (
        <div className="text-spotify-light">
          No playlists yet. Create one to get started.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {playlists.map((p) => (
          <PlaylistCard key={p._id} playlist={p} />
        ))}
      </div>
    </div>
  );
}
