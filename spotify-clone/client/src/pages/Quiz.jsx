import { useEffect, useRef, useState } from 'react';
import { useUser, SignInButton } from '@clerk/clerk-react';
import {
  Gamepad2, Play, Pause, Trophy, Check, X, Loader2, RotateCcw, Medal,
} from 'lucide-react';
import { fetchNewQuiz, submitQuiz, fetchLeaderboard } from '../lib/api';
import { usePlayerStore } from '../store/usePlayerStore';
import { toast } from '../store/useToastStore';
import { EmptyState, Section } from '../components/ui';

const ROUND_SECONDS = 20;

export default function Quiz() {
  const { isSignedIn } = useUser();
  const stopMusic = usePlayerStore((s) => s.pauseForGame);

  const [phase, setPhase] = useState('idle'); // idle | playing | done
  const [quiz, setQuiz] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [picks, setPicks] = useState([]);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [board, setBoard] = useState([]);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const audioRef = useRef(null);

  const loadBoard = () =>
    fetchLeaderboard().then((r) => setBoard(r.items || [])).catch(() => {});

  useEffect(() => { loadBoard(); }, []);

  // Own audio element so quiz clips never fight with the main player
  useEffect(() => {
    const a = new Audio();
    a.volume = 0.85;
    a.onplay = () => setAudioPlaying(true);
    a.onpause = () => setAudioPlaying(false);
    a.onended = () => setAudioPlaying(false);
    audioRef.current = a;
    return () => { a.pause(); a.src = ''; };
  }, []);

  // Per-question countdown; running out counts as a skip
  useEffect(() => {
    if (phase !== 'playing') return;
    setTimeLeft(ROUND_SECONDS);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          answer(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIndex]);

  const playClip = (url) => {
    const a = audioRef.current;
    if (!a) return;
    a.src = url;
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  const start = async () => {
    setLoading(true);
    try {
      stopMusic?.();
      const q = await fetchNewQuiz();
      setQuiz(q);
      setPicks([]);
      setQIndex(0);
      setResult(null);
      setPhase('playing');
      playClip(q.questions[0].previewUrl);
    } catch (err) {
      toast(err.response?.data?.error || 'Could not start the quiz', 'error');
    } finally {
      setLoading(false);
    }
  };

  const answer = async (optionIndex) => {
    const nextPicks = [...picks];
    nextPicks[qIndex] = optionIndex;
    setPicks(nextPicks);
    audioRef.current?.pause();

    if (qIndex + 1 < quiz.questions.length) {
      const next = qIndex + 1;
      setQIndex(next);
      playClip(quiz.questions[next].previewUrl);
    } else {
      setPhase('done');
      setLoading(true);
      try {
        const res = await submitQuiz(quiz.quizId, nextPicks);
        setResult(res);
        loadBoard();
        if (res.newBadges?.length) {
          toast(`New badge: ${res.newBadges.map((b) => `${b.icon} ${b.name}`).join(', ')}`, 'success');
        }
      } catch (err) {
        toast(err.response?.data?.error || 'Could not submit your answers', 'error');
        setPhase('idle');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isSignedIn) {
    return (
      <EmptyState
        icon={Gamepad2}
        title="Guess the Song"
        subtitle="Sign in to play the music quiz, earn XP and climb the leaderboard."
        action={
          <SignInButton mode="modal">
            <button className="bg-white text-black font-semibold px-6 py-3 rounded-full">Sign In</button>
          </SignInButton>
        }
      />
    );
  }

  const question = quiz?.questions?.[qIndex];

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Gamepad2 className="text-accent" /> Guess the Song
        </h1>
        <p className="text-muted text-sm mt-1">
          Hear a clip, name the track. 5 rounds, {ROUND_SECONDS}s each — earn XP and badges.
        </p>
      </div>

      {/* Idle */}
      {phase === 'idle' && (
        <div className="bg-surface-800 border border-white/5 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-3">🎧</div>
          <h2 className="text-xl font-bold">Ready to play?</h2>
          <p className="text-muted text-sm mt-1 mb-5">
            Questions are drawn from the Musify catalog — no two rounds are the same.
          </p>
          <button
            onClick={start}
            disabled={loading}
            className="bg-accent-deep hover:bg-accent text-white font-semibold rounded-full px-8 py-3 inline-flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <Play size={17} />}
            {loading ? 'Dealing…' : 'Start quiz'}
          </button>
        </div>
      )}

      {/* Playing */}
      {phase === 'playing' && question && (
        <div className="bg-surface-800 border border-white/5 rounded-2xl p-6 animate-fade-up">
          <div className="flex items-center justify-between text-sm mb-4">
            <span className="text-muted">
              Question <b className="text-white">{qIndex + 1}</b> of {quiz.questions.length}
            </span>
            <span className={timeLeft <= 5 ? 'text-red-400 font-bold' : 'text-muted'}>{timeLeft}s</span>
          </div>
          <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-accent transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / ROUND_SECONDS) * 100}%` }}
            />
          </div>

          <div className="flex flex-col items-center mb-6">
            <button
              onClick={() =>
                audioPlaying ? audioRef.current?.pause() : playClip(question.previewUrl)
              }
              className="w-20 h-20 rounded-full bg-accent-deep hover:bg-accent text-white flex items-center justify-center hover:scale-105 transition-all shadow-xl"
              aria-label={audioPlaying ? 'Pause clip' : 'Replay clip'}
            >
              {audioPlaying ? <Pause size={30} /> : <Play size={30} className="ml-1" />}
            </button>
            <span className="text-muted text-xs mt-3">
              {audioPlaying ? 'Listening…' : 'Tap to replay the clip'}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {question.options.map((o, i) => (
              <button
                key={i}
                onClick={() => answer(i)}
                className="text-left bg-surface-900 hover:bg-surface-700 border border-white/10 hover:border-accent-deep rounded-xl px-4 py-3 transition-colors"
              >
                <div className="font-semibold truncate">{o.title}</div>
                <div className="text-muted text-xs truncate">{o.artist}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {phase === 'done' && (
        <div className="bg-surface-800 border border-white/5 rounded-2xl p-6 text-center animate-fade-up">
          {loading || !result ? (
            <div className="flex items-center justify-center gap-2 text-muted py-8">
              <Loader2 className="animate-spin" size={18} /> Scoring your round…
            </div>
          ) : (
            <>
              <div className="text-5xl mb-2">{result.perfect ? '🏆' : result.score >= 3 ? '🎉' : '🎵'}</div>
              <h2 className="text-2xl font-extrabold">
                {result.score} / {result.total}
              </h2>
              <p className="text-muted text-sm mt-1">
                {result.perfect ? 'Perfect round!' : result.score >= 3 ? 'Nicely done!' : 'Keep listening — you’ll get there.'}
              </p>
              <div className="flex items-center justify-center gap-4 mt-4 text-sm flex-wrap">
                <span className="bg-accent-deep/25 text-accent-bright rounded-full px-4 py-1.5 font-semibold">
                  +{result.xpEarned} XP
                </span>
                <span className="text-muted">Level {result.level.level}</span>
                <span className="text-muted">Best: {result.highScore}/{result.total}</span>
              </div>

              <div className="mt-6 space-y-2 text-left">
                {result.results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-surface-900 rounded-xl px-4 py-2.5"
                  >
                    {r.correct ? (
                      <Check size={16} className="text-emerald-400 shrink-0" />
                    ) : (
                      <X size={16} className="text-red-400 shrink-0" />
                    )}
                    <span className="text-sm min-w-0 truncate">
                      Q{i + 1}:{' '}
                      <b className="font-semibold">
                        {quiz.questions[i].options[r.correctIndex]?.title}
                      </b>{' '}
                      <span className="text-muted">
                        — {quiz.questions[i].options[r.correctIndex]?.artist}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={start}
                className="mt-6 bg-accent-deep hover:bg-accent text-white font-semibold rounded-full px-6 py-2.5 inline-flex items-center gap-2 transition-colors"
              >
                <RotateCcw size={16} /> Play again
              </button>
            </>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <Section title="Leaderboard">
        {board.length === 0 ? (
          <div className="text-muted text-sm">No scores yet — be the first.</div>
        ) : (
          <div className="bg-surface-800 border border-white/5 rounded-2xl divide-y divide-white/5">
            {board.map((row) => (
              <div key={row.rank} className="flex items-center gap-3 px-4 py-3">
                <span className="w-7 text-center font-bold text-sm">
                  {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : row.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{row.name}</div>
                  <div className="text-muted text-xs">
                    Level {row.level} · {row.games} {row.games === 1 ? 'game' : 'games'}
                  </div>
                </div>
                <span className="flex items-center gap-1 text-sm font-bold">
                  <Medal size={14} className="text-amber-400" /> {row.highScore}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="flex items-center gap-2 text-muted text-xs">
        <Trophy size={13} /> Perfect rounds award bonus XP and unlock the Quiz Master badge.
      </div>
    </div>
  );
}
