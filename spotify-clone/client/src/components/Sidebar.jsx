import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Library, Heart, Plus, LogOut } from 'lucide-react';
import { useUser, useClerk, SignInButton } from '@clerk/clerk-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { useState } from 'react';

const navItem =
  'flex items-center gap-3 px-3 py-2 rounded text-spotify-light hover:text-white transition-colors';
const activeItem = 'text-white';

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
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="flex flex-col gap-2 w-60 shrink-0 p-2 h-full">
      <div className="bg-spotify-dark rounded-lg p-3 space-y-1">
        <NavLink
          to="/"
          className={({ isActive }) => `${navItem} ${isActive ? activeItem : ''}`}
        >
          <Home size={20} /> <span className="font-semibold">Home</span>
        </NavLink>
        <NavLink
          to="/search"
          className={({ isActive }) => `${navItem} ${isActive ? activeItem : ''}`}
        >
          <Search size={20} /> <span className="font-semibold">Search</span>
        </NavLink>
      </div>

      <div className="bg-spotify-dark rounded-lg p-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 text-spotify-light">
            <Library size={20} />
            <span className="font-semibold">Your Library</span>
          </div>
          <button
            onClick={handleCreate}
            disabled={!isSignedIn || creating}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-40"
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
              <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-pink-400 flex items-center justify-center">
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
                <div className="w-8 h-8 rounded bg-spotify-gray flex items-center justify-center text-xs">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{p.name}</span>
              </NavLink>
            ))}
          </div>
        ) : (
          <div className="text-sm text-spotify-light px-3 py-2">
            Sign in to create playlists.
          </div>
        )}
      </div>

      <div className="bg-spotify-dark rounded-lg p-3">
        {isSignedIn ? (
          <div className="flex items-center justify-between">
            <div className="text-sm truncate">
              <div className="font-semibold truncate">
                {user?.fullName || user?.username || 'You'}
              </div>
              <div className="text-spotify-light text-xs truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 rounded hover:bg-white/10"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <SignInButton mode="modal">
            <button className="w-full bg-white text-black font-semibold py-2 rounded-full hover:scale-105 transition-transform">
              Sign In
            </button>
          </SignInButton>
        )}
      </div>
    </aside>
  );
}
