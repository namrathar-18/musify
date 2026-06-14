import { useEffect, useState } from 'react';
import { fetchSongs, fetchRecent } from '../lib/api';
import { useUser } from '@clerk/clerk-react';
import TrackRow from '../components/TrackRow';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { isSignedIn } = useUser();
  const [songs, setSongs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchSongs(page, 20),
      isSignedIn ? fetchRecent().catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
    ])
      .then(([songsRes, recentRes]) => {
        if (cancelled) return;
        setSongs(songsRes.items || []);
        setTotalPages(songsRes.totalPages || 1);
        setRecent(recentRes.items || []);
      })
      .catch((err) => !cancelled && setError(err.response?.data?.error || err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, isSignedIn]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-spotify-light">
        <Loader2 className="animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 p-4">
        <div className="font-semibold mb-2">Failed to load home feed</div>
        <div className="text-sm">{error}</div>
        <div className="text-sm text-spotify-light mt-2">
          If the catalog is empty, run the seed script: <code>cd server && npm run seed</code>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isSignedIn && recent.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Recently played</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {recent.slice(0, 8).map((t) => (
              <div
                key={t.spotifyId}
                className="bg-white/5 hover:bg-white/10 rounded p-2 flex items-center gap-3"
              >
                {t.albumArt && (
                  <img src={t.albumArt} alt="" className="w-12 h-12 rounded" />
                )}
                <div className="min-w-0">
                  <div className="font-semibold truncate text-sm">{t.title}</div>
                  <div className="text-spotify-light text-xs truncate">{t.artist}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-2xl font-bold">Browse catalog</h2>
          <div className="text-sm text-spotify-light">
            Page {page} of {totalPages}
          </div>
        </div>

        {songs.length === 0 ? (
          <div className="text-spotify-light p-4">
            <p>Catalog is empty.</p>
            <p className="text-sm mt-2">
              Run <code className="bg-spotify-gray px-1 rounded">npm run seed</code> in the{' '}
              <code>server/</code> directory to populate it with 500+ tracks from Spotify.
            </p>
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
              {songs.map((t, i) => (
                <TrackRow key={t.spotifyId} track={t} index={i} queue={songs} />
              ))}
            </div>

            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-full bg-spotify-dark hover:bg-spotify-gray disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-full bg-spotify-dark hover:bg-spotify-gray disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
