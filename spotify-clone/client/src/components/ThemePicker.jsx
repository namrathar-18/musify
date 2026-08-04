import { Check, Palette } from 'lucide-react';
import { useThemeStore, ACCENTS, SURFACES } from '../store/useThemeStore';

export default function ThemePicker() {
  const accent = useThemeStore((s) => s.accent);
  const surface = useThemeStore((s) => s.surface);
  const setAccent = useThemeStore((s) => s.setAccent);
  const setSurface = useThemeStore((s) => s.setSurface);

  return (
    <div className="bg-surface-800 border border-white/5 rounded-2xl p-5 space-y-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Palette size={16} className="text-accent" /> Appearance
      </div>

      <div>
        <div className="text-xs uppercase tracking-widest text-muted mb-2">Accent colour</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ACCENTS).map(([key, a]) => (
            <button
              key={key}
              onClick={() => setAccent(key)}
              aria-label={`${a.label} accent`}
              aria-pressed={accent === key}
              title={a.label}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                accent === key ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-800' : ''
              }`}
              style={{ backgroundColor: a.swatch }}
            >
              {accent === key && <Check size={16} className="text-black/70" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-widest text-muted mb-2">Background</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SURFACES).map(([key, s]) => (
            <button
              key={key}
              onClick={() => setSurface(key)}
              aria-pressed={surface === key}
              className={`rounded-xl border px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                surface === key ? 'border-accent bg-accent-deep/15' : 'border-white/10 hover:border-white/30'
              }`}
            >
              <span
                className="w-4 h-4 rounded-full border border-white/20"
                style={{ backgroundColor: s.swatch }}
              />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-muted text-xs">Saved on this device and applied instantly.</p>
    </div>
  );
}
