import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ListMusic, Music2, UserPlus } from 'lucide-react';
import { fetchFeed, fetchFollowing } from '../lib/api';
import { usePlayerStore } from '../store/usePlayerStore';
import { EmptyState, SkeletonRows, Section } from '../components/ui';

const timeAgo = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

export default function Feed() {
  const [data, setData] = useState(null);
  const [following, setFollowing] = useState([]);
  const playQueue = usePlayerStore((s) => s.playQueue);

  useEffect(() => {
    fetchFeed().then(setData).catch(() => setData({ items: [], followingCount: 0 }));
    fetchFollowing().then((r) => setFollowing(r.items || [])).catch(() => {});
  }, []);

  if (!data) return <SkeletonRows count={7} />;

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Users className="text-accent" /> Friend activity
        </h1>
        <p className="text-muted text-sm mt-1">
          What the people you follow have been listening to.
        </p>
      </div>

      {following.length > 0 && (
        <Section title={`Following (${following.length})`}>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {following.map((u) => (
              <Link
                key={u.username}
                to={`/u/${u.username}`}
                className="shrink-0 w-28 bg-surface-800 hover:bg-surface-700 border border-white/5 rounded-2xl p-3 text-center transition-colors"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-accent-deep flex items-center justify-center font-extrabold text-lg">
                  {(u.displayName || u.username || '?').charAt(0).toUpperCase()}
                </div>
                <div className="text-xs font-semibold truncate mt-2">{u.displayName}</div>
                <div className="text-muted text-[10px] truncate">@{u.username}</div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {data.items.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={data.followingCount === 0 ? 'You’re not following anyone yet' : 'No recent activity'}
          subtitle={
            data.followingCount === 0
              ? 'Open someone’s profile at /u/their-username and hit Follow to see their listening here.'
              : 'The people you follow haven’t played anything in the last two weeks.'
          }
        />
      ) : (
        <div className="space-y-2">
          {data.items.map((item, i) => (
            <div
              key={`${item.type}-${i}`}
              className="flex items-center gap-3 bg-surface-800 border border-white/5 rounded-2xl p-3 animate-fade-up"
            >
              {item.type === 'play' ? (
                <>
                  {item.track.albumArt ? (
                    <img src={item.track.albumArt} alt="" className="w-12 h-12 rounded-lg shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
                      <Music2 size={18} className="text-muted" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">
                      {item.user.username ? (
                        <Link to={`/u/${item.user.username}`} className="font-semibold hover:underline">
                          {item.user.displayName}
                        </Link>
                      ) : (
                        <span className="font-semibold">{item.user.displayName}</span>
                      )}{' '}
                      <span className="text-muted">played</span>
                    </div>
                    <div className="font-medium truncate">{item.track.title}</div>
                    <div className="text-muted text-xs truncate">
                      {item.track.artist} · {timeAgo(item.at)}
                    </div>
                  </div>
                  <button
                    onClick={() => playQueue([item.track], 0)}
                    className="text-xs border border-white/15 hover:border-accent hover:text-accent rounded-full px-3 py-1.5 shrink-0 transition-colors"
                  >
                    Play
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent-deep to-pink-500 flex items-center justify-center shrink-0">
                    <ListMusic size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">
                      {item.user.username ? (
                        <Link to={`/u/${item.user.username}`} className="font-semibold hover:underline">
                          {item.user.displayName}
                        </Link>
                      ) : (
                        <span className="font-semibold">{item.user.displayName}</span>
                      )}{' '}
                      <span className="text-muted">shared a playlist</span>
                    </div>
                    <Link to={`/shared/${item.playlist.id}`} className="font-medium truncate hover:underline block">
                      {item.playlist.name}
                    </Link>
                    <div className="text-muted text-xs">
                      {item.playlist.trackCount} tracks · {timeAgo(item.at)}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
