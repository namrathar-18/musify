import { NavLink } from 'react-router-dom';
import { Home, Search, Library, Mic2, Sparkles } from 'lucide-react';

const items = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/assistant', icon: Sparkles, label: 'AI' },
  { to: '/podcasts', icon: Mic2, label: 'Podcasts' },
  { to: '/library', icon: Library, label: 'Library' },
];

// Bottom tab bar shown only on small screens (sidebar covers md+)
export default function MobileNav() {
  return (
    <nav
      className="md:hidden flex items-stretch bg-surface-950 border-t border-white/10"
      aria-label="Primary"
    >
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isActive ? 'text-accent' : 'text-muted'
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
