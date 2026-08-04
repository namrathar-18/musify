import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, ListMusic } from 'lucide-react';
import { fetchSharedPlaylist } from '../lib/api';
import { usePlayerStore } from '../store/usePlayerStore';
import TrackRow from '../components/TrackRow';
import { EmptyState, SkeletonRows } from '../components/ui';

// Read-only view of a playlist someone shared — works signed out.
export default function SharedPlaylist() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const playQueue = usePlayerStore((s) => s.playQueue);

  useEffect(() => {
    let on = true;
    setData(null);
    setError(null);
    fetchSharedPlaylist(id)
      .then((d) => on && setData(d))
      .catch((err) => on && setError(err.response?.data?.error || err.message));
    return () => { on = false; };
  }, [id]);

  if (error) return <EmptyState icon={ListMusic} title="Playlist unavailable" subtitle={error} />;
  if (!data) return <SkeletonRows count={8} />;

  return (
    <div>
      <div className="flex items-end gap-6 mb-8 animate-fade-up">
        <div className="w-36 h-36 md:w-48 md:h-48 rounded-xl bg-gradient-to-br from-accent-deep to-pink-500 shadow-2xl shrink-0 hidden sm:flex items-center justify-center">
          <span className="text-5xl font-extrabold text-white/90">
            {data.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-muted mb-2">Shared playlist</div>
          <h1 className="text-3xl md:text-5xl font-extrabold truncate">{data.name}</h1>
          {data.description && <p className="text-muted text-sm mt-2">{data.description}</p>}
          <div className="text-muted text-sm mt-1">
            by{' '}
            {data.owner.username ? (
              <Link to={`/u/${data.owner.username}`} className="text-white font-semibold hover:underline">
                {data.owner.displayName}
              </Link>
            ) : (
              <span className="text-white font-semibold">{data.owner.displayName}</span>
            )}{' '}
            · {data.tracks.length} tracks
          </div>
          <button
            onClick={() => playQueue(data.tracks, 0)}
            disabled={!data.tracks.length}
            className="mt-4 bg-accent-deep hover:bg-accent text-white font-semibold rounded-full px-6 py-2.5 flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-40"
          >
            <Play size={18} className="fill-white" /> Play
          </button>
        </div>
      </div>

      <div>
        {data.tracks.map((t, i) => (
          <TrackRow key={t.spotifyId} track={t} index={i} queue={data.tracks} />
        ))}
      </div>
    </div>
  );
}
