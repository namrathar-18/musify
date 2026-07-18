import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Disc3 } from 'lucide-react';
import { fetchAlbum } from '../lib/api';
import { usePlayerStore } from '../store/usePlayerStore';
import TrackRow from '../components/TrackRow';
import { SkeletonRows, EmptyState } from '../components/ui';

export default function Album() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const playQueue = usePlayerStore((s) => s.playQueue);

  useEffect(() => {
    let on = true;
    setData(null);
    setError(null);
    fetchAlbum(id)
      .then((d) => on && setData(d))
      .catch((err) => on && setError(err.response?.data?.error || err.message));
    return () => { on = false; };
  }, [id]);

  if (error) {
    return <EmptyState icon={Disc3} title="Album not found" subtitle={error} />;
  }
  if (!data) return <SkeletonRows count={8} />;

  const { album, tracks } = data;

  return (
    <div>
      <div className="flex items-end gap-6 mb-8 animate-fade-up">
        {album.image && (
          <img
            src={album.image}
            alt=""
            className="w-36 h-36 md:w-48 md:h-48 rounded-xl object-cover shadow-2xl shrink-0"
          />
        )}
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-muted mb-2">Album</div>
          <h1 className="text-3xl md:text-5xl font-extrabold truncate">{album.name}</h1>
          <div className="text-muted mt-2 text-sm">
            {album.artistId ? (
              <Link to={`/artist/${album.artistId}`} className="text-white font-semibold hover:underline">
                {album.artist}
              </Link>
            ) : (
              <span className="text-white font-semibold">{album.artist}</span>
            )}
            {album.releaseDate && <> · {album.releaseDate.slice(0, 4)}</>}
            {' · '}{tracks.length} songs
          </div>
          <button
            onClick={() => playQueue(tracks, 0)}
            disabled={!tracks.length}
            className="mt-4 bg-accent-deep hover:bg-accent text-white font-semibold rounded-full px-6 py-2.5 flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-40"
          >
            <Play size={18} className="fill-white" /> Play
          </button>
        </div>
      </div>

      <div>
        {tracks.map((t, i) => (
          <TrackRow key={`${t.spotifyId}-${i}`} track={t} index={i} queue={tracks} />
        ))}
      </div>
    </div>
  );
}
