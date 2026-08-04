import { create } from 'zustand';

// Themes swap CSS variables on :root, so every Tailwind token that reads
// them (accent, surface, muted) recolours instantly — no re-render needed.
export const ACCENTS = {
  violet: { label: 'Violet', swatch: '#a78bfa', vars: { accent: '167 139 250', 'accent-bright': '196 181 253', 'accent-deep': '124 58 237' } },
  emerald: { label: 'Emerald', swatch: '#34d399', vars: { accent: '52 211 153', 'accent-bright': '110 231 183', 'accent-deep': '5 150 105' } },
  rose: { label: 'Rose', swatch: '#fb7185', vars: { accent: '251 113 133', 'accent-bright': '253 164 175', 'accent-deep': '225 29 72' } },
  amber: { label: 'Amber', swatch: '#fbbf24', vars: { accent: '251 191 36', 'accent-bright': '253 216 116', 'accent-deep': '217 119 6' } },
  sky: { label: 'Sky', swatch: '#38bdf8', vars: { accent: '56 189 248', 'accent-bright': '125 211 252', 'accent-deep': '2 132 199' } },
  fuchsia: { label: 'Fuchsia', swatch: '#e879f9', vars: { accent: '232 121 249', 'accent-bright': '240 171 252', 'accent-deep': '162 28 175' } },
};

export const SURFACES = {
  midnight: {
    label: 'Midnight',
    swatch: '#0a0a0f',
    vars: { 'surface-950': '10 10 15', 'surface-900': '19 19 26', 'surface-800': '28 28 38', 'surface-700': '38 38 51', muted: '161 161 181' },
  },
  charcoal: {
    label: 'Charcoal',
    swatch: '#101112',
    vars: { 'surface-950': '13 14 15', 'surface-900': '23 24 26', 'surface-800': '33 35 38', 'surface-700': '46 48 52', muted: '163 166 172' },
  },
  ocean: {
    label: 'Deep ocean',
    swatch: '#07131f',
    vars: { 'surface-950': '7 19 31', 'surface-900': '13 29 45', 'surface-800': '19 41 61', 'surface-700': '28 55 79', muted: '148 168 186' },
  },
};

const STORAGE_KEY = 'musify.theme';

const apply = ({ accent, surface }) => {
  const root = document.documentElement;
  const vars = { ...(ACCENTS[accent]?.vars || {}), ...(SURFACES[surface]?.vars || {}) };
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(`--${key}`, value);
  }
  // Tailwind-driven surfaces pick the new variables up on their own, but a
  // colour declared in plain CSS won't always re-resolve var() after a
  // runtime change — so paint the page background explicitly.
  const base = SURFACES[surface]?.vars['surface-950'];
  if (base) document.body.style.backgroundColor = `rgb(${base.split(' ').join(',')})`;
};

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && ACCENTS[saved.accent] && SURFACES[saved.surface]) return saved;
  } catch {
    // Corrupt or unavailable storage — fall through to defaults
  }
  return { accent: 'violet', surface: 'midnight' };
};

const initial = load();

export const useThemeStore = create((set, get) => ({
  ...initial,

  setAccent: (accent) => {
    const next = { ...get(), accent };
    apply(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accent: next.accent, surface: next.surface }));
    set({ accent });
  },

  setSurface: (surface) => {
    const next = { ...get(), surface };
    apply(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accent: next.accent, surface: next.surface }));
    set({ surface });
  },
}));

// Apply the saved theme before first paint so there's no colour flash
apply(initial);
