import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Flame, Clock3, Music2, Sparkles } from 'lucide-react';
import { fetchStats, aiWeeklyReport, fetchAiStatus } from '../lib/api';
import { EmptyState, Section } from '../components/ui';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

const StatCard = ({ icon: Icon, label, value, sub }) => (
  <div className="bg-surface-800 border border-white/5 rounded-2xl p-5 flex-1 min-w-[140px]">
    <div className="flex items-center gap-2 text-muted text-xs uppercase tracking-widest">
      <Icon size={14} /> {label}
    </div>
    <div className="text-2xl md:text-3xl font-extrabold mt-2">{value}</div>
    {sub && <div className="text-muted text-xs mt-1">{sub}</div>}
  </div>
);

// Last 12 weeks of daily plays as a GitHub-style contribution grid
const CalendarHeatmap = ({ byDay }) => {
  const map = new Map(byDay.map((d) => [d.date, d.plays]));
  const max = Math.max(1, ...byDay.map((d) => d.plays));
  const today = new Date();
  const days = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (83 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, plays: map.get(key) || 0 };
  });
  const level = (p) =>
    p === 0 ? 'bg-surface-700' : p < max * 0.34 ? 'bg-accent-deep/50' : p < max * 0.67 ? 'bg-accent-deep' : 'bg-accent';

  return (
    <div className="grid grid-rows-7 grid-flow-col gap-1 w-fit">
      {days.map((d) => (
        <div
          key={d.key}
          title={`${d.key}: ${d.plays} plays`}
          className={`w-3 h-3 rounded-sm ${level(d.plays)}`}
        />
      ))}
    </div>
  );
};

const HourBars = ({ byHour }) => {
  const max = Math.max(1, ...byHour.map((h) => h.plays));
  return (
    <div className="flex items-end gap-1 h-28">
      {byHour.map((h) => (
        <div key={h.hour} className="flex-1 flex flex-col items-center gap-1" title={`${h.hour}:00 — ${h.plays} plays`}>
          <div
            className={`w-full rounded-t ${h.plays ? 'bg-accent-deep' : 'bg-surface-700'}`}
            style={{ height: `${Math.max(4, (h.plays / max) * 100)}%` }}
          />
          {h.hour % 6 === 0 && <span className="text-[10px] text-muted">{h.hour}</span>}
        </div>
      ))}
    </div>
  );
};

export default function Stats() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    let on = true;
    setStats(null);
    fetchStats(days)
      .then((d) => on && setStats(d))
      .catch((err) => on && setError(err.response?.data?.error || err.message));
    return () => { on = false; };
  }, [days]);

  useEffect(() => {
    fetchAiStatus()
      .then(({ enabled }) => (enabled ? aiWeeklyReport() : null))
      .then((r) => r && setReport(r))
      .catch(() => {});
  }, []);

  if (error) return <EmptyState icon={BarChart3} title="Couldn't load stats" subtitle={error} />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Your listening stats</h1>
        <div className="flex bg-surface-800 rounded-full p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                days === r.days ? 'bg-accent-deep text-white' : 'text-muted hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {report?.enoughData && (
        <div className="rounded-2xl border border-accent-deep/40 bg-gradient-to-r from-accent-deep/25 to-surface-800 p-5 animate-fade-up">
          <div className="flex items-center gap-2 text-accent-bright text-xs font-semibold uppercase tracking-widest mb-2">
            <Sparkles size={14} /> AI weekly report
          </div>
          {report.personality && (
            <div className="text-xl font-extrabold mb-1">You're a {report.personality}</div>
          )}
          <p className="text-sm text-white/85">{report.report}</p>
        </div>
      )}

      {!stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-surface-800 rounded-2xl" />
          ))}
        </div>
      ) : stats.totalPlays === 0 ? (
        <EmptyState
          icon={Music2}
          title="No listening data yet"
          subtitle="Play some tracks and your stats will start building here."
          action={
            <Link to="/" className="bg-accent-deep hover:bg-accent text-white font-semibold rounded-full px-6 py-2.5">
              Explore music
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <StatCard icon={Music2} label="Tracks played" value={stats.totalPlays} sub={`last ${stats.rangeDays} days`} />
            <StatCard icon={Clock3} label="Minutes listened" value={stats.listenedMinutes} sub="30s previews" />
            <StatCard icon={Flame} label="Current streak" value={`${stats.streaks.current}d`} sub={`longest ${stats.streaks.longest}d`} />
            <StatCard icon={BarChart3} label="Top genre" value={stats.topGenres[0]?.name || '—'} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Top artists">
              <div className="space-y-1.5">
                {stats.topArtists.map((a, i) => (
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

            <Section title="Top tracks">
              <div className="space-y-1.5">
                {stats.topTracks.map((t, i) => (
                  <div key={t.spotifyId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                    <span className="text-muted w-5 text-sm text-right">{i + 1}</span>
                    {t.albumArt && <img src={t.albumArt} alt="" className="w-9 h-9 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{t.title}</div>
                      <div className="text-muted text-xs truncate">{t.artist}</div>
                    </div>
                    <span className="text-muted text-sm">{t.plays}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {stats.topGenres.length > 0 && (
            <Section title="Genres">
              <div className="flex flex-wrap gap-2">
                {stats.topGenres.map((g) => (
                  <span key={g.name} className="bg-surface-700 border border-white/5 rounded-full px-4 py-1.5 text-sm">
                    {g.name} <span className="text-muted">· {g.plays}</span>
                  </span>
                ))}
              </div>
            </Section>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Listening calendar">
              <div className="bg-surface-800 border border-white/5 rounded-2xl p-4 overflow-x-auto">
                <CalendarHeatmap byDay={stats.byDay} />
                <div className="text-muted text-xs mt-3">Last 12 weeks · darker = more plays</div>
              </div>
            </Section>
            <Section title="Peak hours">
              <div className="bg-surface-800 border border-white/5 rounded-2xl p-4">
                <HourBars byHour={stats.byHour} />
                <div className="text-muted text-xs mt-2">Plays by hour of day (your timezone)</div>
              </div>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
