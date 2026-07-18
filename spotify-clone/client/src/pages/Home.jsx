import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Play, Sparkles } from 'lucide-react';
import {
  fetchTrending,
  fetchNewReleases,
  fetchTopAlbums,
  fetchSongOfTheDay,
  fetchGenreRow,
  fetchTopPodcasts,
  fetchRecent,
} from '../lib/api';
import { usePlayerStore } from '../store/usePlayerStore';
import TrackCard from '../components/TrackCard';
import { Section, CardRow, SkeletonRow, AlbumCard, PodcastCard } from '../components/ui';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// Small self-loading section: fetch → skeleton → row (hidden on failure)
const LoadedRow = ({ title, fetcher, render, action }) => {
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let on = true;
    fetcher()
      .then((res) => on && setItems(res.items || []))
      .catch(() => on && setFailed(true));
    return () => { on = false; };
  }, [fetcher]);

  if (failed || (items && items.length === 0)) return null;
  return (
    <Section title={title} action={action}>
      {items === null ? <SkeletonRow /> : <CardRow>{items.map(render)}</CardRow>}
    </Section>
  );
};

export default function Home() {
  const { isSignedIn, user } = useUser();
  const playQueue = usePlayerStore((s) => s.playQueue);
  const [sotd, setSotd] = useState(null);
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    fetchSongOfTheDay().then((r) => setSotd(r.track)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSignedIn) { setRecent(null); return; }
    fetchRecent().then((r) => setRecent(r.items || [])).catch(() => setRecent([]));
  }, [isSignedIn]);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          {greeting()}
          {isSignedIn && user?.firstName ? `, ${user.firstName}` : ''}
        </h1>
        {sotd && (
          <div className="mt-4 relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent-deep/60 via-surface-800 to-surface-900 border border-white/10">
            <div className="flex items-center gap-5 p-5 md:p-6">
              {sotd.albumArt && (
                <img
                  src={sotd.albumArt}
                  alt=""
                  className="w-24 h-24 md:w-32 md:h-32 rounded-xl shadow-2xl shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-accent-bright text-xs font-semibold uppercase tracking-widest">
                  <Sparkles size={14} /> Song of the day
                </div>
                <div className="text-xl md:text-3xl font-extrabold truncate mt-1">{sotd.title}</div>
                <div className="text-muted truncate">{sotd.artist}</div>
              </div>
              <button
                onClick={() => playQueue([sotd], 0)}
                className="bg-white text-black rounded-full w-12 h-12 md:w-14 md:h-14 flex items-center justify-center hover:scale-105 transition-transform shrink-0"
                aria-label={`Play ${sotd.title}`}
              >
                <Play size={22} className="ml-0.5 fill-black" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Continue listening */}
      {isSignedIn && recent && recent.length > 0 && (
        <Section
          title="Continue listening"
          action={
            <Link to="/stats" className="text-sm text-muted hover:text-white hover:underline">
              Your stats →
            </Link>
          }
        >
          <CardRow>
            {recent.slice(0, 12).map((t, i) => (
              <TrackCard key={t.spotifyId} track={t} queue={recent} index={i} />
            ))}
          </CardRow>
        </Section>
      )}

      <LoadedRow
        title="Trending now"
        fetcher={fetchTrending}
        render={(t, i, arr) => <TrackCard key={t.spotifyId} track={t} queue={arr} index={i} />}
      />

      <LoadedRow
        title="New releases"
        fetcher={fetchNewReleases}
        render={(t, i, arr) => <TrackCard key={t.spotifyId} track={t} queue={arr} index={i} />}
      />

      <LoadedRow
        title="Top albums"
        fetcher={fetchTopAlbums}
        render={(al) => <AlbumCard key={al.id} album={al} />}
      />

      <LoadedRow
        title="Chill vibes"
        fetcher={chillFetcher}
        render={(t, i, arr) => <TrackCard key={t.spotifyId} track={t} queue={arr} index={i} />}
      />

      <LoadedRow
        title="Workout energy"
        fetcher={workoutFetcher}
        render={(t, i, arr) => <TrackCard key={t.spotifyId} track={t} queue={arr} index={i} />}
      />

      <LoadedRow
        title="Top podcasts"
        fetcher={fetchTopPodcasts}
        render={(p) => <PodcastCard key={p.id} podcast={p} />}
        action={
          <Link to="/podcasts" className="text-sm text-muted hover:text-white hover:underline">
            See all →
          </Link>
        }
      />
    </div>
  );
}

// Stable fetcher refs so LoadedRow's effect doesn't re-run every render
const chillFetcher = () => fetchGenreRow('chill acoustic');
const workoutFetcher = () => fetchGenreRow('workout');
