import { useToastStore } from '../store/useToastStore';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const icons = {
  success: <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />,
  error: <AlertCircle size={16} className="text-red-400 shrink-0" />,
  info: <Info size={16} className="text-accent shrink-0" />,
};

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  if (!toasts.length) return null;
  return (
    <div
      aria-live="polite"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 bg-surface-700 border border-white/10 shadow-xl rounded-full px-4 py-2 text-sm animate-fade-up"
        >
          {icons[t.kind] || icons.info}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
