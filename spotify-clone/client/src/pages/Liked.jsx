import { useEffect, useState } from 'react';
import { fetchLiked } from '../lib/api';
import TrackRow from '../components/TrackRow';
import { Heart, Loader2, Play } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export default function Liked() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const playQueue = usePlayerStore((s) => s.playQueue);

  useEffect(() => {
    fetchLiked()
      .then((res) => setTracks(res.items || []))
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center text-spotify-light">
        <Loader2 className="animate-spin mr-2" /> Loading…
      </div>
    );
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div>
      <div className="flex items-end gap-6 mb-8">
        <div className="w-48 h-48 rounded bg-gradient-to-br from-indigo-500 to-pink-400 shadow-2xl shrink-0 flex items-center justify-center">
          <Heart size={64} className="fill-white text-white" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-spotify-light mb-2">
            Playlist
          </div>
          <h1 className="text-5xl font-bold">Liked Songs</h1>
          <div className="text-spotify-light text-sm mt-3">{tracks.length} tracks</div>
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={() => playQueue(tracks, 0)}
          disabled={tracks.length === 0}
          className="bg-spotify-green hover:bg-green-500 text-black rounded-full w-14 h-14 flex items-center justify-center disabled:opacity-40 hover:scale-105 transition-transform"
        >
          <Play size={24} className="ml-1 fill-black" />
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="text-spotify-light text-center py-12">
          You haven't liked any songs yet. Tap the heart on any track.
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
            {tracks.map((t, i) => (
              <TrackRow key={t.spotifyId} track={t} index={i} queue={tracks} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
