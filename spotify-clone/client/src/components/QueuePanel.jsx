import { X, Play, Trash2, ListMusic } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { EmptyState } from './ui';

export default function QueuePanel() {
  const queueOpen = usePlayerStore((s) => s.queueOpen);
  const queue = usePlayerStore((s) => s.queue);
  const index = usePlayerStore((s) => s.index);
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const _playAt = usePlayerStore((s) => s._playAt);

  if (!queueOpen) return null;

  return (
    <aside
      className="fixed right-0 top-0 bottom-20 w-full sm:w-80 bg-surface-900 border-l border-white/10 z-40 flex flex-col animate-slide-in-right"
      aria-label="Play queue"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="font-bold">Queue</h3>
        <button
          onClick={() => setQueueOpen(false)}
          className="p-1 text-muted hover:text-white"
          aria-label="Close queue"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {queue.length === 0 ? (
          <EmptyState
            icon={ListMusic}
            title="Queue is empty"
            subtitle="Play something or use “Add to queue” on any track."
          />
        ) : (
          queue.map((t, i) => (
            <div
              key={`${t.spotifyId}-${i}`}
              className={`flex items-center gap-3 px-2 py-2 rounded-md group ${
                i === index ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              {t.albumArt && <img src={t.albumArt} alt="" className="w-9 h-9 rounded shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium truncate ${i === index ? 'text-accent' : ''}`}>
                  {t.title}
                </div>
                <div className="text-muted text-xs truncate">{t.artist}</div>
              </div>
              {i !== index && (
                <>
                  <button
                    onClick={() => _playAt(i)}
                    className="p-1 text-muted hover:text-white opacity-0 group-hover:opacity-100"
                    aria-label={`Play ${t.title}`}
                  >
                    <Play size={14} />
                  </button>
                  <button
                    onClick={() => removeFromQueue(i)}
                    className="p-1 text-muted hover:text-red-400 opacity-0 group-hover:opacity-100"
                    aria-label={`Remove ${t.title} from queue`}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
