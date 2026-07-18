import { useEffect, useState } from 'react';
import { Mic2 } from 'lucide-react';
import { fetchTopPodcasts, searchPodcasts } from '../lib/api';
import SearchBar from '../components/SearchBar';
import { PodcastCard, EmptyState, SkeletonCard } from '../components/ui';

export default function Podcasts() {
  const [q, setQ] = useState('');
  const [top, setTop] = useState(null);
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchTopPodcasts().then((r) => setTop(r.items || [])).catch(() => setTop([]));
  }, []);

  useEffect(() => {
    if (!q.trim()) { setResults(null); return; }
    const handle = setTimeout(() => {
      setSearching(true);
      searchPodcasts(q)
        .then((r) => setResults(r.items || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [q]);

  const shown = results ?? top;
  const heading = results ? `Results for “${q}”` : 'Top podcasts';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Podcasts</h1>
      <div className="max-w-xl">
        <SearchBar value={q} onChange={setQ} placeholder="Search podcasts" />
      </div>

      <h2 className="text-xl font-bold">{heading}</h2>

      {shown === null || searching ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Mic2}
          title={results ? 'No podcasts found' : 'Podcasts unavailable'}
          subtitle={results ? 'Try a different search term.' : 'Please try again in a moment.'}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {shown.map((p) => (
            <PodcastCard key={p.id} podcast={p} />
          ))}
        </div>
      )}
    </div>
  );
}
