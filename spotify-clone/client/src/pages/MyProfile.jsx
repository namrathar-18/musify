import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { UserRound, Save, Copy, Globe, Lock, Loader2, Crown, History, Play } from 'lucide-react';
import { fetchProgress, fetchMe, updateProfile, fetchTimeCapsule } from '../lib/api';
import { toast } from '../store/useToastStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { Section } from '../components/ui';
import LevelRing from '../components/LevelRing';
import ThemePicker from '../components/ThemePicker';

export default function MyProfile() {
  const { user } = useUser();
  const [progress, setProgress] = useState(null);
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({ username: '', bio: '', isPublic: true });
  const [saving, setSaving] = useState(false);
  const [capsule, setCapsule] = useState(null);
  const playQueue = usePlayerStore((s) => s.playQueue);

  useEffect(() => {
    fetchTimeCapsule().then(setCapsule).catch(() => {});
    fetchProgress().then(setProgress).catch(() => {});
    fetchMe()
      .then((d) => {
        setMe(d);
        setForm({ username: d.username || '', bio: d.bio || '', isPublic: d.isPublic !== false });
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await updateProfile({
        username: form.username || undefined,
        bio: form.bio,
        isPublic: form.isPublic,
      });
      setMe((m) => ({ ...m, ...saved }));
      toast('Profile saved', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Could not save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const shareUrl = me?.username ? `${window.location.origin}/u/${me.username}` : '';

  const copyShare = () => {
    navigator.clipboard?.writeText(shareUrl);
    toast('Profile link copied', 'success');
  };

  const earned = progress?.badges.filter((b) => b.earned) || [];
  const locked = progress?.badges.filter((b) => !b.earned) || [];

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-5 animate-fade-up">
        {progress ? (
          <LevelRing level={progress.level} progress={progress.progress} />
        ) : (
          <div className="w-24 h-24 rounded-full bg-surface-800 animate-pulse" />
        )}
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight truncate">
            {user?.fullName || me?.displayName || 'Your profile'}
          </h1>
          <div className="text-muted text-sm mt-1">
            {progress ? (
              <>
                {progress.xp} XP · {progress.nextLevelAt - progress.xp} XP to level {progress.level + 1}
              </>
            ) : (
              'Loading…'
            )}
          </div>
          {me?.premiumStatus === 'active' && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs bg-amber-400/15 text-amber-400 rounded-full px-3 py-1">
              <Crown size={12} /> Premium {me.premiumPlan}
            </span>
          )}
        </div>
      </div>

      {/* Quick stats */}
      {progress && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['Tracks played', progress.stats.plays],
            ['Playlists', progress.stats.playlists],
            ['Day streak', progress.stats.streak],
            ['Quiz best', `${progress.stats.quizHighScore}/5`],
          ].map(([label, value]) => (
            <div key={label} className="bg-surface-800 border border-white/5 rounded-2xl p-4">
              <div className="text-xl font-extrabold">{value}</div>
              <div className="text-muted text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Badges */}
      <Section title={`Badges ${earned.length ? `(${earned.length}/${progress.badges.length})` : ''}`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[...earned, ...locked].map((b) => (
            <div
              key={b.id}
              title={b.description}
              className={`rounded-2xl border p-4 text-center transition-colors ${
                b.earned
                  ? 'border-accent-deep/50 bg-accent-deep/10'
                  : 'border-white/5 bg-surface-800 opacity-45'
              }`}
            >
              <div className="text-3xl mb-1">{b.earned ? b.icon : '🔒'}</div>
              <div className="font-semibold text-sm truncate">{b.name}</div>
              <div className="text-muted text-[11px] mt-0.5 leading-snug">{b.description}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Time capsule */}
      {capsule && !capsule.empty && (
        <Section title={<span className="flex items-center gap-2"><History size={18} className="text-accent" /> Time capsule</span>}>
          <div className="space-y-4">
            {capsule.sections.map((s) => (
              <div key={s.id} className="bg-surface-800 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3 gap-3">
                  <div>
                    <div className="font-bold">{s.label}</div>
                    <div className="text-muted text-xs">{s.date} · what you had on repeat</div>
                  </div>
                  <button
                    onClick={() => playQueue(s.tracks, 0)}
                    className="text-xs border border-white/15 hover:border-accent hover:text-accent rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <Play size={12} /> Replay
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                  {s.tracks.map((t) => (
                    <div key={t.spotifyId} className="w-24 shrink-0">
                      {t.albumArt ? (
                        <img src={t.albumArt} alt="" className="w-24 h-24 rounded-lg object-cover" />
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-surface-700" />
                      )}
                      <div className="text-xs font-medium truncate mt-1.5">{t.title}</div>
                      <div className="text-muted text-[10px] truncate">{t.artist}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Appearance */}
      <Section title="Appearance">
        <ThemePicker />
      </Section>

      {/* Public profile settings */}
      <Section title="Public profile">
        <div className="bg-surface-800 border border-white/5 rounded-2xl p-5 space-y-4">
          <div>
            <label htmlFor="username" className="text-sm font-medium">Username</label>
            <div className="flex gap-2 mt-1.5">
              <span className="flex items-center text-muted text-sm">musify.app/u/</span>
              <input
                id="username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="yourname"
                className="flex-1 bg-surface-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <p className="text-muted text-xs mt-1">3–20 characters: letters, numbers, underscore.</p>
          </div>

          <div>
            <label htmlFor="bio" className="text-sm font-medium">Bio</label>
            <textarea
              id="bio"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value.slice(0, 200) }))}
              rows={2}
              placeholder="Tell people what you listen to…"
              className="w-full mt-1.5 bg-surface-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none"
            />
            <p className="text-muted text-xs mt-1">{form.bio.length}/200</p>
          </div>

          <button
            onClick={() => setForm((f) => ({ ...f, isPublic: !f.isPublic }))}
            className="flex items-center gap-2 text-sm"
            aria-pressed={form.isPublic}
          >
            <span
              className={`w-10 h-6 rounded-full transition-colors relative ${
                form.isPublic ? 'bg-accent-deep' : 'bg-surface-700'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                  form.isPublic ? 'left-5' : 'left-1'
                }`}
              />
            </span>
            {form.isPublic ? (
              <><Globe size={14} /> Profile is public</>
            ) : (
              <><Lock size={14} /> Profile is private</>
            )}
          </button>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="bg-accent-deep hover:bg-accent text-white font-semibold rounded-full px-5 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
            </button>
            {me?.username && (
              <>
                <button
                  onClick={copyShare}
                  className="border border-white/15 hover:border-accent rounded-full px-4 py-2 text-sm inline-flex items-center gap-2"
                >
                  <Copy size={14} /> Copy link
                </button>
                <Link to={`/u/${me.username}`} className="text-accent text-sm hover:underline">
                  View public page →
                </Link>
              </>
            )}
          </div>
        </div>
      </Section>

      {!me && (
        <div className="flex items-center gap-2 text-muted text-sm">
          <UserRound size={15} /> Loading your profile…
        </div>
      )}
    </div>
  );
}
