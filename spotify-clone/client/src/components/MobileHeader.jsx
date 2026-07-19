import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { Crown } from 'lucide-react';
import Logo from './Logo';

// Slim top bar on small screens: brand + Premium + auth entry point.
// (On md+ the sidebar carries all three, so this hides itself.)
export default function MobileHeader() {
  return (
    <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-surface-950 border-b border-white/10">
      <Link to="/" aria-label="Musify home">
        <Logo size={28} />
      </Link>
      <div className="flex items-center gap-3">
        <Link to="/premium" aria-label="Premium" className="text-amber-400 p-1">
          <Crown size={20} />
        </Link>
        <SignedOut>
          <SignInButton mode="modal">
            <button className="bg-white text-black text-sm font-semibold px-4 py-1.5 rounded-full">
              Sign In
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </header>
  );
}
