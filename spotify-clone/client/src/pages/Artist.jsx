import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, UserX } from 'lucide-react';
import { fetchArtist } from '../lib/api';
import { usePlayerStore } from '../store/usePlayerStore';
import TrackRow from '../components/TrackRow';
import { Section, CardRow, AlbumCard, SkeletonRows, EmptyState } from '../components/ui';

export default function Artist() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const playQueue = usePlayerStore((s) => s.playQueue);

  useEffect(() => {
    let on = true;
    setData(null);
    setError(null);
    fetchArtist(id)
      .then((d) => on && setData(d))
      .catch((err) => on && setError(err.response?.data?.error || err.message));
    return () => { on = false; };
  }, [id]);

  if (error) {
    return <EmptyState icon={UserX} title="Artist not found" subtitle={error} />;
  }
  if (!data) return <SkeletonRows count={8} />;

  const { artist, topSongs, albums } = data;

  return (
    <div className="space-y-10">
      <div className="flex items-end gap-6 animate-fade-up">
        {artist.image && (
          <img
            src={artist.image}
            alt=""
            className="w-36 h-36 md:w-48 md:h-48 rounded-full object-cover shadow-2xl shrink-0"
          />
        )}
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-muted mb-2">Artist</div>
          <h1 className="text-3xl md:text-5xl font-extrabold truncate">{artist.name}</h1>
          {artist.genre && <div className="text-muted mt-2">{artist.genre}</div>}
          <button
            onClick={() => playQueue(topSongs, 0)}
            disabled={!topSongs.length}
            className="mt-4 bg-accent-deep hover:bg-accent text-white font-semibold rounded-full px-6 py-2.5 flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-40"
          >
            <Play size={18} className="fill-white" /> Play
          </button>
        </div>
      </div>

      {topSongs.length > 0 && (
        <Section title="Popular">
          <div>
            {topSongs.map((t, i) => (
              <TrackRow key={`${t.spotifyId}-${i}`} track={t} index={i} queue={topSongs} />
            ))}
          </div>
        </Section>
      )}

      {albums.length > 0 && (
        <Section title="Albums">
          <CardRow>
            {albums.map((al) => (
              <AlbumCard key={al.id} album={al} />
            ))}
          </CardRow>
        </Section>
      )}
    </div>
  );
}
