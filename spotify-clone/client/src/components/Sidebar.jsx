import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  Library,
  Heart,
  Plus,
  LogOut,
  Mic2,
  Sparkles,
  BarChart3,
  Crown,
} from 'lucide-react';
import { useUser, useClerk, SignInButton } from '@clerk/clerk-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { toast } from '../store/useToastStore';
import { useState } from 'react';
import Logo from './Logo';

const navItem =
  'flex items-center gap-3 px-3 py-2 rounded-lg text-muted hover:text-white transition-colors';
const activeItem = 'text-white bg-white/5';

const NavEntry = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `${navItem} ${isActive ? activeItem : ''}`}
  >
    <Icon size={20} /> <span className="font-semibold">{label}</span>
  </NavLink>
);

export default function Sidebar() {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const playlists = useLibraryStore((s) => s.playlists);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!isSignedIn) return;
    setCreating(true);
    try {
      const p = await createPlaylist(`My Playlist #${playlists.length + 1}`);
      navigate(`/playlist/${p._id}`);
    } catch {
      toast('Could not create playlist', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="hidden md:flex flex-col gap-2 w-64 shrink-0 p-2 h-full">
      {/* Brand */}
      <div className="bg-surface-900 rounded-xl p-4">
        <Logo size={32} />
      </div>

      <nav className="bg-surface-900 rounded-xl p-3 space-y-1" aria-label="Primary">
        <NavEntry to="/" icon={Home} label="Home" />
        <NavEntry to="/search" icon={Search} label="Search" />
        <NavEntry to="/podcasts" icon={Mic2} label="Podcasts" />
        <NavEntry to="/assistant" icon={Sparkles} label="AI Assistant" />
        <NavEntry to="/stats" icon={BarChart3} label="Stats" />
        <NavEntry to="/premium" icon={Crown} label="Premium" />
      </nav>

      <div className="bg-surface-900 rounded-xl p-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 text-muted px-1">
            <Library size={20} />
            <span className="font-semibold">Your Library</span>
          </div>
          <button
            onClick={handleCreate}
            disabled={!isSignedIn || creating}
            className="p-1 rounded-md hover:bg-white/10 disabled:opacity-40"
            aria-label="Create playlist"
            title="Create playlist"
          >
            <Plus size={18} />
          </button>
        </div>

        {isSignedIn ? (
          <div className="space-y-1">
            <NavLink
              to="/liked"
              className={({ isActive }) =>
                `${navItem} text-sm ${isActive ? activeItem : ''}`
              }
            >
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent-deep to-pink-500 flex items-center justify-center shrink-0">
                <Heart size={14} className="fill-white text-white" />
              </div>
              <span>Liked Songs</span>
            </NavLink>

            {playlists.map((p) => (
              <NavLink
                key={p._id}
                to={`/playlist/${p._id}`}
                className={({ isActive }) =>
                  `${navItem} text-sm truncate ${isActive ? activeItem : ''}`
                }
              >
                <div className="w-8 h-8 rounded-md bg-surface-700 flex items-center justify-center text-xs shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{p.name}</span>
              </NavLink>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted px-3 py-2">
            Sign in to create playlists.
          </div>
        )}
      </div>

      <div className="bg-surface-900 rounded-xl p-3">
        {isSignedIn ? (
          <div className="flex items-center justify-between">
            <div className="text-sm truncate">
              <div className="font-semibold truncate">
                {user?.fullName || user?.username || 'You'}
              </div>
              <div className="text-muted text-xs truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 rounded-md hover:bg-white/10"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <SignInButton mode="modal">
            <button className="w-full bg-white text-black font-semibold py-2 rounded-full hover:scale-[1.02] transition-transform">
              Sign In
            </button>
          </SignInButton>
        )}
      </div>
    </aside>
  );
}
