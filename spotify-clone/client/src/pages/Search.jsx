import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Sparkles, SearchX, History, X } from 'lucide-react';
import { searchAll, searchPodcasts, aiSearch, fetchAiStatus } from '../lib/api';
import SearchBar from '../components/SearchBar';
import TrackRow from '../components/TrackRow';
import { SkeletonRows, EmptyState, PodcastCard } from '../components/ui';

const TABS = ['All', 'Songs', 'Artists', 'Albums', 'Podcasts'];
const RECENT_KEY = 'musify.recentSearches';

const loadRecent = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
};

export default function Search() {
  const { isSignedIn } = useUser();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('All');
  const [aiMode, setAiMode] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [results, setResults] = useState({ tracks: [], artists: [], albums: [], podcasts: [] });
  const [interpretation, setInterpretation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState(loadRecent);

  useEffect(() => {
    fetchAiStatus().then(({ enabled }) => setAiAvailable(enabled)).catch(() => {});
  }, []);

  const remember = (term) => {
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, 8);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    if (!q.trim()) {
      setResults({ tracks: [], artists: [], albums: [], podcasts: [] });
      setInterpretation('');
      setError(null);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      setInterpretation('');
      try {
        if (aiMode && aiAvailable && isSignedIn) {
          const res = await aiSearch(q);
          setResults({ tracks: res.tracks || [], artists: [], albums: [], podcasts: [] });
          setInterpretation(res.interpretation || '');
        } else {
          const [main, pods] = await Promise.all([
            searchAll(q),
            searchPodcasts(q).catch(() => ({ items: [] })),
          ]);
          setResults({
            tracks: main.tracks || [],
            artists: main.artists || [],
            albums: main.albums || [],
            podcasts: pods.items || [],
          });
        }
        remember(q.trim());
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    }, aiMode ? 700 : 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, aiMode]);

  const nothingFound = useMemo(
    () =>
      !loading &&
      q &&
      !results.tracks.length &&
      !results.artists.length &&
      !results.albums.length &&
      !results.podcasts.length,
    [loading, q, results]
  );

  const showSection = (name) => tab === 'All' || tab === name;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 max-w-xl">
          <SearchBar
            value={q}
            onChange={setQ}
            placeholder={aiMode ? 'Describe it… “sad songs for late night drives”' : 'What do you want to play?'}
          />
        </div>
        {aiAvailable && isSignedIn && (
          <button
            onClick={() => setAiMode((v) => !v)}
            aria-pressed={aiMode}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-colors self-start ${
              aiMode
                ? 'bg-accent-deep border-accent-deep text-white'
                : 'border-white/15 text-muted hover:text-white'
            }`}
          >
            <Sparkles size={15} /> AI search
          </button>
        )}
      </div>

      {/* Recent searches (idle state) */}
      {!q && recent.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-muted text-sm mb-2">
            <History size={15} /> Recent searches
            <button
              onClick={() => { setRecent([]); localStorage.removeItem(RECENT_KEY); }}
              className="ml-1 hover:text-white"
              aria-label="Clear recent searches"
            >
              <X size={13} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <button
                key={r}
                onClick={() => setQ(r)}
                className="bg-surface-800 hover:bg-surface-700 border border-white/5 rounded-full px-4 py-1.5 text-sm transition-colors"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {q && !aiMode && (
        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t ? 'bg-white text-black' : 'bg-surface-800 text-muted hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {interpretation && (
        <div className="text-sm text-accent-bright flex items-center gap-2">
          <Sparkles size={14} /> {interpretation}
        </div>
      )}

      {loading && <SkeletonRows count={6} />}
      {error && <div className="text-red-400">Search failed: {error}</div>}
      {nothingFound && (
        <EmptyState icon={SearchX} title={`No results for “${q}”`} subtitle="Check the spelling or try different keywords." />
      )}

      {!loading && showSection('Artists') && results.artists.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3">Artists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.artists.slice(0, 6).map((a) => (
              <Link
                key={a.id}
                to={/^\d+$/.test(a.id) ? `/artist/${a.id}` : '#'}
                className="bg-surface-800 hover:bg-surface-700 border border-white/5 p-4 rounded-xl text-center transition-colors group"
              >
                <img
                  src={a.image || ''}
                  alt=""
                  loading="lazy"
                  className="w-full aspect-square rounded-full object-cover bg-surface-700 mb-3 group-hover:scale-105 transition-transform"
                />
                <div className="font-semibold truncate">{a.name}</div>
                <div className="text-muted text-xs mt-0.5">Artist</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && showSection('Songs') && results.tracks.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3">Songs</h2>
          <div>
            {results.tracks.map((t, i) => (
              <TrackRow key={t.spotifyId} track={t} index={i} queue={results.tracks} />
            ))}
          </div>
        </section>
      )}

      {!loading && showSection('Albums') && results.albums.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.albums.slice(0, 12).map((al) => (
              <Link
                key={al.id}
                to={`/album/${al.id}`}
                className="bg-surface-800 hover:bg-surface-700 border border-white/5 p-4 rounded-xl transition-colors group"
              >
                <img
                  src={al.image || ''}
                  alt=""
                  loading="lazy"
                  className="w-full aspect-square rounded-lg object-cover bg-surface-700 mb-3 group-hover:scale-105 transition-transform"
                />
                <div className="font-semibold truncate text-sm">{al.name}</div>
                <div className="text-muted text-xs truncate mt-0.5">{al.artist}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && showSection('Podcasts') && results.podcasts.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3">Podcasts</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.podcasts.slice(0, 6).map((p) => (
              <PodcastCard key={p.id} podcast={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
