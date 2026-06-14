import { useEffect, useState } from 'react';
import { searchAll } from '../lib/api';
import SearchBar from '../components/SearchBar';
import TrackRow from '../components/TrackRow';
import { Loader2 } from 'lucide-react';

export default function Search() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState({ tracks: [], artists: [], albums: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults({ tracks: [], artists: [], albums: [] });
      return;
    }
    const handle = setTimeout(() => {
      setLoading(true);
      setError(null);
      searchAll(q)
        .then(setResults)
        .catch((err) => setError(err.response?.data?.error || err.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [q]);

  return (
    <div className="space-y-6">
      <SearchBar value={q} onChange={setQ} />

      {loading && (
        <div className="flex items-center text-spotify-light">
          <Loader2 className="animate-spin mr-2" /> Searching…
        </div>
      )}

      {error && <div className="text-red-400">Search failed: {error}</div>}

      {!loading && q && results.tracks.length === 0 && results.artists.length === 0 && (
        <div className="text-spotify-light">No results for "{q}"</div>
      )}

      {results.artists.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-3">Artists</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.artists.slice(0, 6).map((a) => (
              <div key={a.id} className="bg-spotify-dark p-3 rounded text-center">
                <img
                  src={a.image || ''}
                  alt=""
                  className="w-full aspect-square rounded-full object-cover bg-spotify-gray mb-2"
                />
                <div className="font-semibold truncate">{a.name}</div>
                <div className="text-spotify-light text-xs">Artist</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {results.tracks.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-3">Tracks</h2>
          <div className="grid grid-cols-[2rem,1fr,1fr,4rem,auto] gap-4 px-4 pb-2 border-b border-white/10 text-xs uppercase tracking-wider text-spotify-light">
            <div>#</div>
            <div>Title</div>
            <div>Album</div>
            <div>Time</div>
            <div></div>
          </div>
          <div className="mt-2">
            {results.tracks.map((t, i) => (
              <TrackRow
                key={t.spotifyId}
                track={t}
                index={i}
                queue={results.tracks}
              />
            ))}
          </div>
        </section>
      )}

      {results.albums.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-3">Albums</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.albums.slice(0, 12).map((al) => (
              <div key={al.id} className="bg-spotify-dark p-3 rounded">
                <img
                  src={al.image || ''}
                  alt=""
                  className="w-full aspect-square rounded object-cover bg-spotify-gray mb-2"
                />
                <div className="font-semibold truncate text-sm">{al.name}</div>
                <div className="text-spotify-light text-xs truncate">{al.artist}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
