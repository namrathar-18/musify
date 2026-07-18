import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, Mic2 } from 'lucide-react';
import { fetchPodcast } from '../lib/api';
import { usePlayerStore } from '../store/usePlayerStore';
import { SkeletonRows, EmptyState } from '../components/ui';

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

const fmtDur = (ms) => {
  if (!ms) return '';
  const min = Math.round(ms / 60000);
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min`;
};

// Episodes ride the same player pipeline as tracks — full audio via public RSS.
const episodeToTrack = (show, ep) => ({
  spotifyId: `ep-${ep.id}`,
  title: ep.title,
  artist: show.name,
  album: 'Podcast',
  albumArt: ep.image || show.image,
  previewUrl: ep.audioUrl,
  duration: ep.duration,
  isEpisode: true,
});

export default function PodcastShow() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  useEffect(() => {
    let on = true;
    setData(null);
    setError(null);
    fetchPodcast(id)
      .then((d) => on && setData(d))
      .catch((err) => on && setError(err.response?.data?.error || err.message));
    return () => { on = false; };
  }, [id]);

  if (error) return <EmptyState icon={Mic2} title="Podcast not found" subtitle={error} />;
  if (!data) return <SkeletonRows count={8} />;

  const { show, episodes } = data;
  const queue = episodes.map((ep) => episodeToTrack(show, ep));

  return (
    <div>
      <div className="flex items-end gap-6 mb-8 animate-fade-up">
        {show.image && (
          <img
            src={show.image}
            alt=""
            className="w-36 h-36 md:w-48 md:h-48 rounded-xl object-cover shadow-2xl shrink-0"
          />
        )}
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-muted mb-2">Podcast</div>
          <h1 className="text-3xl md:text-5xl font-extrabold truncate">{show.name}</h1>
          <div className="text-muted mt-2">{show.publisher}</div>
          {show.genres?.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {show.genres.slice(0, 4).map((g) => (
                <span key={g} className="text-xs bg-surface-700 rounded-full px-3 py-1">{g}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {show.description && (
        <p className="text-muted text-sm max-w-3xl mb-8">{show.description}</p>
      )}

      <h2 className="text-xl font-bold mb-3">Episodes</h2>
      {episodes.length === 0 ? (
        <EmptyState
          icon={Mic2}
          title="No episodes available"
          subtitle="This show's feed couldn't be loaded right now."
        />
      ) : (
        <div className="space-y-2">
          {episodes.map((ep, i) => {
            const t = queue[i];
            const isCurrent = currentTrack?.spotifyId === t.spotifyId;
            const showPause = isCurrent && isPlaying;
            return (
              <div
                key={ep.id}
                className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                  isCurrent ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <button
                  onClick={() => (isCurrent ? togglePlay() : playQueue(queue, i))}
                  className="w-10 h-10 rounded-full bg-accent-deep text-white flex items-center justify-center hover:scale-105 transition-transform shrink-0"
                  aria-label={showPause ? `Pause ${ep.title}` : `Play ${ep.title}`}
                >
                  {showPause ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`font-semibold truncate ${isCurrent ? 'text-accent' : ''}`}>
                    {ep.title}
                  </div>
                  {ep.description && (
                    <div className="text-muted text-sm truncate">{ep.description}</div>
                  )}
                  <div className="text-muted text-xs mt-1">
                    {fmtDate(ep.publishedAt)}
                    {ep.duration ? ` · ${fmtDur(ep.duration)}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
