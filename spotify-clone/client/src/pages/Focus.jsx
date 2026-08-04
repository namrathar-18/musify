import { useEffect, useRef, useState } from 'react';
import { Timer, Play, Pause, RotateCcw, Coffee, Brain, Loader2 } from 'lucide-react';
import { fetchGenreRow } from '../lib/api';
import { usePlayerStore } from '../store/usePlayerStore';
import { toast } from '../store/useToastStore';

const MODES = {
  focus: { label: 'Focus', minutes: 25, icon: Brain, query: 'lofi study beats' },
  short: { label: 'Short break', minutes: 5, icon: Coffee, query: 'calm ambient piano' },
  long: { label: 'Long break', minutes: 15, icon: Coffee, query: 'chillout relax' },
};

const SOUNDSCAPES = [
  { id: 'lofi', label: 'Lo-fi beats', emoji: '🎧', query: 'lofi hip hop study' },
  { id: 'piano', label: 'Peaceful piano', emoji: '🎹', query: 'peaceful piano instrumental' },
  { id: 'classical', label: 'Classical focus', emoji: '🎻', query: 'classical study concentration' },
  { id: 'jazz', label: 'Coffee jazz', emoji: '☕', query: 'smooth jazz cafe instrumental' },
  { id: 'ambient', label: 'Deep ambient', emoji: '🌌', query: 'ambient soundscape meditation' },
  { id: 'nature', label: 'Nature sounds', emoji: '🌿', query: 'nature sounds rain relaxation' },
];

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Focus() {
  const [mode, setMode] = useState('focus');
  const [secondsLeft, setSecondsLeft] = useState(MODES.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [loadingScape, setLoadingScape] = useState(null);
  const [activeScape, setActiveScape] = useState(null);

  const playQueue = usePlayerStore((s) => s.playQueue);
  const pausePlayer = usePlayerStore((s) => s.pauseForGame);
  const intervalRef = useRef(null);

  const switchMode = (next) => {
    setMode(next);
    setRunning(false);
    setSecondsLeft(MODES[next].minutes * 60);
  };

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          setCompleted((c) => (mode === 'focus' ? c + 1 : c));
          // Chime with the Web Audio API — no asset needed
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
            osc.start();
            osc.stop(ctx.currentTime + 1.2);
          } catch {}
          toast(
            mode === 'focus' ? 'Focus session complete — take a break! ☕' : 'Break over — back to it 🧠',
            'success'
          );
          if (mode === 'focus') pausePlayer?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, mode, pausePlayer]);

  const startScape = async (scape) => {
    setLoadingScape(scape.id);
    try {
      const { items } = await fetchGenreRow(scape.query);
      if (!items?.length) {
        toast('No tracks found for that soundscape', 'error');
        return;
      }
      playQueue(items, 0);
      setActiveScape(scape.id);
    } catch {
      toast('Could not load that soundscape', 'error');
    } finally {
      setLoadingScape(null);
    }
  };

  const ModeIcon = MODES[mode].icon;
  const total = MODES[mode].minutes * 60;
  const pct = ((total - secondsLeft) / total) * 100;

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Timer className="text-accent" /> Focus Mode
        </h1>
        <p className="text-muted text-sm mt-1">
          A Pomodoro timer paired with focus soundscapes — work in sprints, rest on purpose.
        </p>
      </div>

      {/* Timer card */}
      <div className="bg-gradient-to-br from-accent-deep/25 to-surface-800 border border-white/10 rounded-3xl p-8 text-center">
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {Object.entries(MODES).map(([key, m]) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === key ? 'bg-white text-black' : 'bg-surface-900/70 text-muted hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="text-6xl md:text-7xl font-extrabold tabular-nums tracking-tight">
          {fmt(secondsLeft)}
        </div>
        <div className="flex items-center justify-center gap-2 text-muted text-sm mt-2">
          <ModeIcon size={14} /> {MODES[mode].label}
        </div>

        <div className="h-2 bg-surface-900 rounded-full overflow-hidden mt-6 max-w-md mx-auto">
          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setRunning((r) => !r)}
            disabled={secondsLeft === 0}
            className="bg-white text-black font-semibold rounded-full px-8 py-3 inline-flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-40"
          >
            {running ? <Pause size={18} /> : <Play size={18} />}
            {running ? 'Pause' : secondsLeft === total ? 'Start' : 'Resume'}
          </button>
          <button
            onClick={() => { setRunning(false); setSecondsLeft(total); }}
            className="border border-white/20 hover:border-white rounded-full p-3"
            aria-label="Reset timer"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        {completed > 0 && (
          <div className="text-muted text-sm mt-5">
            🍅 {completed} focus {completed === 1 ? 'session' : 'sessions'} completed today
          </div>
        )}
      </div>

      {/* Soundscapes */}
      <div>
        <h2 className="text-xl font-bold mb-3">Focus soundscapes</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SOUNDSCAPES.map((s) => (
            <button
              key={s.id}
              onClick={() => startScape(s)}
              disabled={loadingScape !== null}
              className={`rounded-2xl border p-4 text-left transition-colors disabled:opacity-60 ${
                activeScape === s.id
                  ? 'border-accent bg-accent-deep/15'
                  : 'border-white/5 bg-surface-800 hover:border-accent-deep/60'
              }`}
            >
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className="font-semibold text-sm flex items-center gap-2">
                {s.label}
                {loadingScape === s.id && <Loader2 size={12} className="animate-spin" />}
              </div>
              <div className="text-muted text-xs mt-0.5">
                {activeScape === s.id ? 'Now playing' : 'Tap to play'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
