import { useEffect, useState } from 'react';
import { X, Sparkles, Ear, Loader2 } from 'lucide-react';
import { fetchSongStory } from '../lib/api';
import { usePlayerStore } from '../store/usePlayerStore';
import TrackRow from './TrackRow';

// AI-written background for the song currently open. Driven by the store so
// any surface (player, track row) can request it.
export default function SongStory() {
  const track = usePlayerStore((s) => s.storyTrack);
  const close = usePlayerStore((s) => s.closeStory);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!track) { setData(null); setError(null); return; }
    let on = true;
    setData(null);
    setError(null);
    fetchSongStory(track.spotifyId)
      .then((d) => on && setData(d))
      .catch((err) => on && setError(err.response?.data?.error || 'Could not load this story'));
    return () => { on = false; };
  }, [track]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  if (!track) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={close}
      role="dialog"
      aria-label="Song story"
    >
      <div
        className="bg-surface-900 border border-white/10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-surface-900/95 backdrop-blur px-5 py-4 border-b border-white/10 flex items-start gap-3">
          {track.albumArt && (
            <img src={track.albumArt} alt="" className="w-12 h-12 rounded-lg shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-accent-bright text-[11px] font-semibold uppercase tracking-widest">
              <Sparkles size={12} /> Song story
            </div>
            <div className="font-bold truncate">{track.title}</div>
            <div className="text-muted text-xs truncate">{track.artist}</div>
          </div>
          <button onClick={close} className="p-1 text-muted hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && <div className="text-red-400 text-sm">{error}</div>}

          {!data && !error && (
            <div className="flex items-center gap-2 text-muted text-sm py-6">
              <Loader2 size={16} className="animate-spin" /> Writing the story…
            </div>
          )}

          {data && (
            <>
              <p className="text-sm leading-relaxed text-white/90">{data.story}</p>

              {data.listenFor && (
                <div className="bg-surface-800 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted mb-1">
                    <Ear size={12} /> Listen for
                  </div>
                  <p className="text-sm text-white/85">{data.listenFor}</p>
                </div>
              )}

              {data.mood?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.mood.map((m) => (
                    <span key={m} className="bg-accent-deep/20 border border-accent-deep/40 rounded-full px-3 py-1 text-xs">
                      {m}
                    </span>
                  ))}
                </div>
              )}

              {data.similar?.length > 0 && (
                <div>
                  <h3 className="font-bold text-sm mb-2">If you like this</h3>
                  <div className="bg-surface-950/60 rounded-xl p-1">
                    {data.similar.map((t, i) => (
                      <TrackRow key={t.spotifyId} track={t} index={i} queue={data.similar} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
