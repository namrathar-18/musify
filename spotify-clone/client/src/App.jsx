import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, useUser, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { setAuthTokenGetter } from './lib/api';
import { usePlayerStore } from './store/usePlayerStore';
import { useLibraryStore } from './store/useLibraryStore';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import { Loader2 } from 'lucide-react';

// Code-split each page to keep the initial JS bundle small
const Home = lazy(() => import('./pages/Home.jsx'));
const Search = lazy(() => import('./pages/Search.jsx'));
const Library = lazy(() => import('./pages/Library.jsx'));
const Playlist = lazy(() => import('./pages/Playlist.jsx'));
const Liked = lazy(() => import('./pages/Liked.jsx'));

const PageFallback = () => (
  <div className="flex items-center justify-center h-64 text-spotify-light">
    <Loader2 className="animate-spin mr-2" /> Loading page…
  </div>
);

// Routes that require auth — redirects to home with a sign-in prompt if not signed in
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
    <div className="h-full flex flex-col bg-black">
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 m-2 ml-0 rounded-lg overflow-y-auto bg-gradient-to-b from-spotify-gray to-spotify-black p-6">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <Player />
    </div>
  );
}
