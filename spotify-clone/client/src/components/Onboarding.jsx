import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { fetchMe, updateProfile } from '../lib/api';
import Logo from './Logo';

const GENRES = [
  { name: 'Pop', emoji: '🎤' },
  { name: 'Hip-Hop', emoji: '🎙️' },
  { name: 'Rock', emoji: '🎸' },
  { name: 'Electronic', emoji: '🎛️' },
  { name: 'R&B', emoji: '💫' },
  { name: 'Indie', emoji: '🌻' },
  { name: 'Jazz', emoji: '🎷' },
  { name: 'Classical', emoji: '🎻' },
  { name: 'Country', emoji: '🤠' },
  { name: 'Metal', emoji: '🤘' },
  { name: 'Lo-fi', emoji: '📻' },
  { name: 'K-Pop', emoji: '🌟' },
];

// First-run genre picker. Shows once per account; the picks seed the AI daily
// mix before there's any listening history to learn from.
export default function Onboarding() {
  const { isSignedIn } = useUser();
  const [show, setShow] = useState(false);
  const [picked, setPicked] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    fetchMe()
      .then((me) => setShow(!me.onboarded))
      .catch(() => {});
  }, [isSignedIn]);

  const finish = async (genres) => {
    setSaving(true);
    try {
      await updateProfile({ favoriteGenres: genres, onboarded: true });
    } catch {
      // Non-blocking: never trap a new user behind a failed preference save
    } finally {
      setSaving(false);
      setShow(false);
    }
  };

  if (!show) return null;

  const toggle = (name) =>
    setPicked((p) => (p.includes(name) ? p.filter((g) => g !== name) : [...p, name].slice(0, 8)));

  return (
    <div className="fixed inset-0 z-[60] bg-surface-950/95 backdrop-blur flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface-900 border border-white/10 rounded-3xl p-6 md:p-8 animate-fade-up">
        <div className="flex justify-center mb-5">
          <Logo size={40} />
        </div>
        <h2 className="text-2xl font-extrabold text-center">Welcome to Musify</h2>
        <p className="text-muted text-sm text-center mt-1.5">
          Pick a few genres you love — your AI daily mix starts from here.
        </p>

        <div className="grid grid-cols-3 gap-2 mt-6">
          {GENRES.map((g) => {
            const on = picked.includes(g.name);
            return (
              <button
                key={g.name}
                onClick={() => toggle(g.name)}
                aria-pressed={on}
                className={`rounded-xl border p-3 text-center transition-colors ${
                  on
                    ? 'border-accent bg-accent-deep/25'
                    : 'border-white/10 bg-surface-800 hover:border-accent-deep/60'
                }`}
              >
                <div className="text-xl">{g.emoji}</div>
                <div className="text-xs font-medium mt-1 truncate">{g.name}</div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-6 gap-3">
          <button
            onClick={() => finish([])}
            className="text-muted text-sm hover:text-white"
            disabled={saving}
          >
            Skip for now
          </button>
          <button
            onClick={() => finish(picked)}
            disabled={saving || picked.length === 0}
            className="bg-accent-deep hover:bg-accent text-white font-semibold rounded-full px-6 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {picked.length ? `Continue with ${picked.length}` : 'Pick at least one'}
            {!saving && picked.length > 0 && <ArrowRight size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
