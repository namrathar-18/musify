import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserRound, Crown, Music2 } from 'lucide-react';
import { fetchPublicProfile } from '../lib/api';
import { EmptyState, Section, SkeletonRows } from '../components/ui';
import LevelRing from '../components/LevelRing';

export default function PublicProfile() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let on = true;
    setData(null);
    setError(null);
    fetchPublicProfile(username)
      .then((d) => on && setData(d))
      .catch((err) => on && setError(err.response?.data?.error || err.message));
    return () => { on = false; };
  }, [username]);

  if (error) return <EmptyState icon={UserRound} title="Profile unavailable" subtitle={error} />;
  if (!data) return <SkeletonRows count={6} />;

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-5 animate-fade-up">
        <LevelRing level={data.level} progress={data.progress} />
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-muted">Profile</div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight truncate">
            {data.displayName}
          </h1>
          <div className="text-muted text-sm">@{data.username}</div>
          {data.isPremium && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs bg-amber-400/15 text-amber-400 rounded-full px-3 py-1">
              <Crown size={12} /> Premium
            </span>
          )}
        </div>
      </div>

      {data.bio && <p className="text-white/85">{data.bio}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Tracks played', data.totalPlays],
          ['Minutes', data.minutesListened],
          ['Badges', data.badges.length],
          ['Quiz best', `${data.quizHighScore}/5`],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface-800 border border-white/5 rounded-2xl p-4">
            <div className="text-xl font-extrabold">{value}</div>
            <div className="text-muted text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {data.badges.length > 0 && (
        <Section title="Badges">
          <div className="flex flex-wrap gap-2">
            {data.badges.map((b) => (
              <span
                key={b.id}
                title={b.description}
                className="bg-accent-deep/15 border border-accent-deep/40 rounded-full px-4 py-1.5 text-sm"
              >
                {b.icon} {b.name}
              </span>
            ))}
          </div>
        </Section>
      )}

      {data.topArtists.length > 0 && (
        <Section title="On repeat lately">
          <div className="space-y-1.5">
            {data.topArtists.map((a, i) => (
              <div key={a.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                <span className="text-muted w-5 text-sm text-right">{i + 1}</span>
                {a.image && <img src={a.image} alt="" className="w-9 h-9 rounded-full object-cover" />}
                <span className="flex-1 min-w-0 font-medium truncate">
                  {a.artistId ? (
                    <Link to={`/artist/${a.artistId}`} className="hover:underline">{a.name}</Link>
                  ) : a.name}
                </span>
                <span className="text-muted text-sm">{a.plays} plays</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.playlists.length > 0 && (
        <Section title="Public playlists">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.playlists.map((p) => (
              <Link
                key={p.id}
                to={`/shared/${p.id}`}
                className="bg-surface-800 hover:bg-surface-700 border border-white/5 rounded-2xl p-4 transition-colors"
              >
                <Music2 size={18} className="text-accent mb-2" />
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-muted text-xs mt-0.5">{p.trackCount} tracks</div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {data.favoriteGenres?.length > 0 && (
        <Section title="Favourite genres">
          <div className="flex flex-wrap gap-2">
            {data.favoriteGenres.map((g) => (
              <span key={g} className="bg-surface-700 rounded-full px-4 py-1.5 text-sm">{g}</span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
