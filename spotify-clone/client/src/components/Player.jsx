import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Moon,
  Gauge,
  Maximize2,
} from 'lucide-react';
import { useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { toast } from '../store/useToastStore';
import { useUser } from '@clerk/clerk-react';

export const formatTime = (s) => {
  if (!Number.isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h
    ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    : `${m}:${sec.toString().padStart(2, '0')}`;
};

const RATES = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS = [5, 15, 30, 60];

export default function Player() {
  const { isSignedIn } = useUser();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const rate = usePlayerStore((s) => s.rate);
  const sleepAt = usePlayerStore((s) => s.sleepAt);
  const queueOpen = usePlayerStore((s) => s.queueOpen);

  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const setRate = usePlayerStore((s) => s.setRate);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen);
  const setFullscreen = usePlayerStore((s) => s.setFullscreen);

  const [showRates, setShowRates] = useState(false);
  const [showSleep, setShowSleep] = useState(false);

  const isLiked = useLibraryStore((s) =>
    currentTrack ? s.likedIds.has(currentTrack.spotifyId) : false
  );
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  if (!currentTrack) {
    return (
      <div className="h-20 bg-surface-950 border-t border-white/10 flex items-center justify-center text-muted text-sm">
        Pick a track to start playing
      </div>
    );
  }

  const noPreview = !currentTrack.previewUrl;

  return (
    <div className="h-20 bg-surface-950 border-t border-white/10 px-3 md:px-4 grid grid-cols-[1fr,auto] md:grid-cols-3 items-center gap-2">
      {/* Left: track info */}
      <div className="flex items-center gap-3 min-w-0">
        {currentTrack.albumArt && (
          <button
            onClick={() => setFullscreen(true)}
            className="relative shrink-0 group"
            aria-label="Open fullscreen player"
            title="Fullscreen"
          >
            <img src={currentTrack.albumArt} alt="" className="w-12 h-12 md:w-14 md:h-14 rounded" />
            <span className="absolute inset-0 rounded bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 size={16} />
            </span>
          </button>
        )}
        <div className="min-w-0">
          <div className="font-semibold truncate text-sm md:text-base">{currentTrack.title}</div>
          <div className="text-muted text-xs md:text-sm truncate">{currentTrack.artist}</div>
        </div>
        {isSignedIn && !currentTrack.isEpisode && (
          <button
            onClick={() => toggleLike(currentTrack.spotifyId).catch(() => toast('Could not update like', 'error'))}
            className="ml-1 p-2 hover:scale-105 transition-transform hidden sm:block"
            aria-label={isLiked ? 'Unlike' : 'Like'}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={18} className={isLiked ? 'fill-accent text-accent' : 'text-muted'} />
          </button>
        )}
      </div>

      {/* Middle: controls */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={toggleShuffle}
            className={`hidden sm:block ${shuffle ? 'text-accent' : 'text-muted hover:text-white'}`}
            aria-pressed={shuffle}
            aria-label="Toggle shuffle"
            title={`Shuffle ${shuffle ? 'on' : 'off'} (s)`}
          >
            <Shuffle size={17} />
          </button>
          <button onClick={prev} className="text-muted hover:text-white" aria-label="Previous track">
            <SkipBack size={20} />
          </button>
          <button
            onClick={togglePlay}
            disabled={noPreview}
            className="bg-white rounded-full w-9 h-9 flex items-center justify-center text-black hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={noPreview ? 'No preview available' : isPlaying ? 'Pause (space)' : 'Play (space)'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>
          <button onClick={next} className="text-muted hover:text-white" aria-label="Next track">
            <SkipForward size={20} />
          </button>
          <button
            onClick={cycleRepeat}
            className={`hidden sm:block ${repeat !== 'off' ? 'text-accent' : 'text-muted hover:text-white'}`}
            aria-label={`Repeat: ${repeat}`}
            title={`Repeat ${repeat} (r)`}
          >
            {repeat === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}
          </button>
        </div>
        <div className="hidden md:flex items-center gap-2 w-full max-w-md">
          <span className="text-xs text-muted w-10 text-right">{formatTime(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 30}
            step={0.1}
            value={Math.min(progress, duration || 30)}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="flex-1"
            disabled={noPreview}
            aria-label="Seek"
          />
          <span className="text-xs text-muted w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: extras */}
      <div className="hidden md:flex items-center justify-end gap-1">
        {/* Playback speed */}
        <div className="relative">
          <button
            onClick={() => { setShowRates((v) => !v); setShowSleep(false); }}
            className={`p-2 ${rate !== 1 ? 'text-accent' : 'text-muted hover:text-white'}`}
            aria-label="Playback speed"
            title={`Speed ${rate}x`}
          >
            <Gauge size={17} />
          </button>
          {showRates && (
            <div className="absolute bottom-full right-0 mb-2 bg-surface-700 border border-white/10 rounded-lg shadow-xl py-1 z-30">
              {RATES.map((r) => (
                <button
                  key={r}
                  onClick={() => { setRate(r); setShowRates(false); }}
                  className={`block w-full text-left px-4 py-1.5 text-sm hover:bg-white/10 ${r === rate ? 'text-accent' : ''}`}
                >
                  {r}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sleep timer */}
        <div className="relative">
          <button
            onClick={() => { setShowSleep((v) => !v); setShowRates(false); }}
            className={`p-2 ${sleepAt ? 'text-accent' : 'text-muted hover:text-white'}`}
            aria-label="Sleep timer"
            title={sleepAt ? 'Sleep timer active' : 'Sleep timer'}
          >
            <Moon size={17} />
          </button>
          {showSleep && (
            <div className="absolute bottom-full right-0 mb-2 bg-surface-700 border border-white/10 rounded-lg shadow-xl py-1 z-30 min-w-[130px]">
              {SLEEP_OPTIONS.map((min) => (
                <button
                  key={min}
                  onClick={() => {
                    setSleepTimer(min);
                    setShowSleep(false);
                    toast(`Sleeping in ${min} min`, 'success');
                  }}
                  className="block w-full text-left px-4 py-1.5 text-sm hover:bg-white/10"
                >
                  In {min} min
                </button>
              ))}
              {sleepAt && (
                <button
                  onClick={() => { setSleepTimer(null); setShowSleep(false); toast('Sleep timer off'); }}
                  className="block w-full text-left px-4 py-1.5 text-sm text-red-400 hover:bg-white/10"
                >
                  Turn off
                </button>
              )}
            </div>
          )}
        </div>

        {/* Queue */}
        <button
          onClick={() => setQueueOpen(!queueOpen)}
          className={`p-2 ${queueOpen ? 'text-accent' : 'text-muted hover:text-white'}`}
          aria-label="Queue"
          title="Queue (q)"
        >
          <ListMusic size={17} />
        </button>

        {/* Volume */}
        <button
          onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
          className="p-2 text-muted hover:text-white"
          aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          title="Mute (m)"
        >
          {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-24"
          aria-label="Volume"
        />
      </div>

      {/* Mobile: compact queue button */}
      <div className="flex md:hidden items-center">
        <button
          onClick={() => setQueueOpen(!queueOpen)}
          className={`p-2 ${queueOpen ? 'text-accent' : 'text-muted'}`}
          aria-label="Queue"
        >
          <ListMusic size={18} />
        </button>
      </div>
    </div>
  );
}
