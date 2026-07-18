import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Send, ListMusic, Loader2, Bot } from 'lucide-react';
import { aiChat, aiGeneratePlaylist, fetchAiStatus } from '../lib/api';
import { useLibraryStore } from '../store/useLibraryStore';
import { toast } from '../store/useToastStore';
import TrackRow from '../components/TrackRow';
import { EmptyState } from '../components/ui';

const SUGGESTIONS = [
  'Suggest songs for a rainy evening',
  'Explain what makes Radiohead special',
  'Songs like Coldplay but heavier',
  'What should I listen to while coding?',
];

const PLAYLIST_IDEAS = ['Late-night coding focus', 'Sunday morning coffee', '2000s throwback party'];

export default function Assistant() {
  const navigate = useNavigate();
  const loadLibrary = useLibraryStore((s) => s.loadAll);
  const [enabled, setEnabled] = useState(null);
  const [messages, setMessages] = useState([]); // {role, content, tracks?}
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [plPrompt, setPlPrompt] = useState('');
  const [plBusy, setPlBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    fetchAiStatus().then(({ enabled: e }) => setEnabled(e)).catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput('');
    const history = [...messages, { role: 'user', content }];
    setMessages(history);
    setBusy(true);
    try {
      const res = await aiChat(history.map(({ role, content: c }) => ({ role, content: c })));
      setMessages([...history, { role: 'assistant', content: res.reply, tracks: res.tracks }]);
    } catch (err) {
      setMessages([
        ...history,
        {
          role: 'assistant',
          content: err.response?.data?.error || 'Something went wrong — please try again.',
          failed: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    const prompt = plPrompt.trim();
    if (!prompt || plBusy) return;
    setPlBusy(true);
    try {
      const { playlist } = await aiGeneratePlaylist(prompt);
      toast(`Created “${playlist.name}”`, 'success');
      loadLibrary().catch(() => {});
      navigate(`/playlist/${playlist._id}`);
    } catch (err) {
      toast(err.response?.data?.error || 'Playlist generation failed', 'error');
    } finally {
      setPlBusy(false);
    }
  };

  if (enabled === false) {
    return (
      <EmptyState
        icon={Bot}
        title="AI features are not configured"
        subtitle="The server is missing an AI API key. Set GROQ_API_KEY and redeploy to enable the assistant."
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Sparkles className="text-accent" /> AI Assistant
        </h1>
        <p className="text-muted text-sm mt-1">
          Ask for recommendations, explanations, or vibes — every suggestion comes back playable.
        </p>
      </div>

      {/* AI playlist generator */}
      <div className="bg-surface-800 border border-white/5 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <ListMusic size={16} className="text-accent" /> Generate a playlist
        </div>
        <div className="flex gap-2">
          <input
            value={plPrompt}
            onChange={(e) => setPlPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generate()}
            placeholder="Describe it… e.g. “rainy day acoustic for studying”"
            className="flex-1 bg-surface-950 border border-white/10 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
            aria-label="Playlist description"
          />
          <button
            onClick={generate}
            disabled={plBusy || !plPrompt.trim()}
            className="bg-accent-deep hover:bg-accent text-white font-semibold rounded-full px-5 py-2.5 text-sm disabled:opacity-40 flex items-center gap-2 shrink-0"
          >
            {plBusy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {plBusy ? 'Creating…' : 'Create'}
          </button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {PLAYLIST_IDEAS.map((idea) => (
            <button
              key={idea}
              onClick={() => setPlPrompt(idea)}
              className="text-xs bg-surface-700 hover:bg-surface-700/70 border border-white/5 rounded-full px-3 py-1.5 text-muted hover:text-white transition-colors"
            >
              {idea}
            </button>
          ))}
        </div>
      </div>

      {/* Chat thread */}
      <div className="flex-1 space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {SUGGESTIONS.map((sugg) => (
              <button
                key={sugg}
                onClick={() => send(sugg)}
                className="text-left text-sm bg-surface-800 hover:bg-surface-700 border border-white/5 rounded-xl px-4 py-3 transition-colors"
              >
                {sugg}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`animate-fade-up ${m.role === 'user' ? 'flex justify-end' : ''}`}>
            {m.role === 'user' ? (
              <div className="bg-accent-deep/80 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] text-sm">
                {m.content}
              </div>
            ) : (
              <div className="max-w-full">
                <div
                  className={`bg-surface-800 border border-white/5 rounded-2xl rounded-bl-md px-4 py-3 text-sm whitespace-pre-wrap ${
                    m.failed ? 'text-red-300' : ''
                  }`}
                >
                  {m.content}
                </div>
                {m.tracks?.length > 0 && (
                  <div className="mt-2 bg-surface-900 border border-white/5 rounded-xl p-1">
                    {m.tracks.map((t, ti) => (
                      <TrackRow key={t.spotifyId} track={t} index={ti} queue={m.tracks} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-muted text-sm">
            <Loader2 size={15} className="animate-spin" /> Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 bg-gradient-to-t from-surface-950 via-surface-950 to-transparent pt-4 pb-1">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask about music…"
            className="flex-1 bg-surface-800 border border-white/10 rounded-full px-4 py-3 text-sm focus:outline-none focus:border-accent"
            aria-label="Message the assistant"
          />
          <button
            onClick={() => send()}
            disabled={busy || !input.trim()}
            className="bg-accent-deep hover:bg-accent text-white rounded-full w-12 h-12 flex items-center justify-center disabled:opacity-40 shrink-0"
            aria-label="Send"
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
