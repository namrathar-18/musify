import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import Logo from './Logo';

// Slim top bar on small screens: brand + auth entry point.
// (On md+ the sidebar carries both, so this hides itself.)
export default function MobileHeader() {
  return (
    <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-surface-950 border-b border-white/10">
      <Link to="/" aria-label="Musify home">
        <Logo size={28} />
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
    </header>
  );
}
