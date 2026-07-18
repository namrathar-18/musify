import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth, useUser, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { setAuthTokenGetter } from './lib/api';
import { usePlayerStore } from './store/usePlayerStore';
import { useLibraryStore } from './store/useLibraryStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Player from './components/Player';
import QueuePanel from './components/QueuePanel';
import FullscreenPlayer from './components/FullscreenPlayer';
import Toaster from './components/Toaster';
import { Loader2 } from 'lucide-react';

// Code-split each page to keep the initial JS bundle small
const Home = lazy(() => import('./pages/Home.jsx'));
const Search = lazy(() => import('./pages/Search.jsx'));
const Library = lazy(() => import('./pages/Library.jsx'));
const Playlist = lazy(() => import('./pages/Playlist.jsx'));
const Liked = lazy(() => import('./pages/Liked.jsx'));
const Artist = lazy(() => import('./pages/Artist.jsx'));
const Album = lazy(() => import('./pages/Album.jsx'));
const Podcasts = lazy(() => import('./pages/Podcasts.jsx'));
const PodcastShow = lazy(() => import('./pages/PodcastShow.jsx'));
const Stats = lazy(() => import('./pages/Stats.jsx'));
const Assistant = lazy(() => import('./pages/Assistant.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

const PageFallback = () => (
  <div className="flex items-center justify-center h-64 text-muted">
    <Loader2 className="animate-spin mr-2" /> Loading page…
  </div>
);

// Routes that require auth — shows a sign-in prompt if signed out
const Protected = ({ children }) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut>
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">Sign in to access this page</h2>
        <SignInButton mode="modal">
          <button className="bg-white text-black font-semibold px-6 py-3 rounded-full">
            Sign In
          </button>
        </SignInButton>
      </div>
    </SignedOut>
  </>
);

export default function App() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const initAudio = usePlayerStore((s) => s.initAudio);
  const setAuthed = usePlayerStore((s) => s.setAuthed);
  const loadLibrary = useLibraryStore((s) => s.loadAll);

  useKeyboardShortcuts();

  // Wire Clerk's getToken into the axios client
  useEffect(() => {
    setAuthTokenGetter(getToken);
  }, [getToken]);

  // Initialize the singleton Audio element once
  useEffect(() => {
    initAudio();
  }, [initAudio]);

  // When signed in, load the user's library
  useEffect(() => {
    setAuthed(!!isSignedIn);
    if (isLoaded && isSignedIn) {
      loadLibrary().catch(() => {});
    }
  }, [isLoaded, isSignedIn, user?.id, loadLibrary, setAuthed]);

  return (
    <div className="h-full flex flex-col bg-surface-950">
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 md:m-2 md:ml-0 md:rounded-xl overflow-y-auto bg-gradient-to-b from-surface-900 to-surface-950 p-4 md:p-6 pb-8">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/podcasts" element={<Podcasts />} />
              <Route path="/podcast/:id" element={<PodcastShow />} />
              <Route path="/artist/:id" element={<Artist />} />
              <Route path="/album/:id" element={<Album />} />
              <Route
                path="/library"
                element={
                  <Protected>
                    <Library />
                  </Protected>
                }
              />
              <Route
                path="/liked"
                element={
                  <Protected>
                    <Liked />
                  </Protected>
                }
              />
              <Route
                path="/playlist/:id"
                element={
                  <Protected>
                    <Playlist />
                  </Protected>
                }
              />
              <Route
                path="/stats"
                element={
                  <Protected>
                    <Stats />
                  </Protected>
                }
              />
              <Route
                path="/assistant"
                element={
                  <Protected>
                    <Assistant />
                  </Protected>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <Player />
      <MobileNav />
      <QueuePanel />
      <FullscreenPlayer />
      <Toaster />
    </div>
  );
}
