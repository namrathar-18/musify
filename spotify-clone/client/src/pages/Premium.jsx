import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser, SignInButton } from '@clerk/clerk-react';
import { Crown, Check, Loader2, ExternalLink } from 'lucide-react';
import {
  fetchPlans,
  fetchBillingStatus,
  createCheckout,
  confirmCheckout,
  cancelSubscription,
  fetchBillingHistory,
} from '../lib/api';
import { toast } from '../store/useToastStore';
import { EmptyState, Section } from '../components/ui';

const fmtAmount = (paise, currency) =>
  `${currency === 'inr' ? '₹' : ''}${(paise / 100).toFixed(0)}`;

const FREE_FEATURES = ['Full catalog & 30s previews', 'Playlists & likes', 'Podcasts', 'Listening stats'];

export default function Premium() {
  const { isSignedIn } = useUser();
  const [params, setParams] = useSearchParams();
  const [plans, setPlans] = useState(null);
  const [enabled, setEnabled] = useState(true);
  const [billing, setBilling] = useState(null); // {plan, status}
  const [history, setHistory] = useState([]);
  const [busyPlan, setBusyPlan] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const refresh = () => {
    if (!isSignedIn) return;
    fetchBillingStatus().then(setBilling).catch(() => {});
    fetchBillingHistory().then((r) => setHistory(r.items || [])).catch(() => {});
  };

  useEffect(() => {
    fetchPlans()
      .then((r) => { setPlans(r.plans); setEnabled(r.enabled); })
      .catch(() => setPlans([]));
  }, []);

  useEffect(refresh, [isSignedIn]);

  // Return from Stripe Checkout: verify the session server-side
  useEffect(() => {
    const status = params.get('status');
    const sessionId = params.get('session_id');
    if (status === 'success' && sessionId && isSignedIn) {
      setConfirming(true);
      confirmCheckout(sessionId)
        .then(({ plan }) => {
          toast(`Welcome to Premium ${plan}! 🎉`, 'success');
          refresh();
        })
        .catch((err) => toast(err.response?.data?.error || 'Could not verify payment', 'error'))
        .finally(() => {
          setConfirming(false);
          setParams({}, { replace: true });
        });
    } else if (status === 'cancelled') {
      toast('Checkout cancelled');
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, isSignedIn]);

  const upgrade = async (planId) => {
    setBusyPlan(planId);
    try {
      const { url } = await createCheckout(planId);
      window.location.href = url; // Stripe-hosted checkout
    } catch (err) {
      toast(err.response?.data?.error || 'Could not start checkout', 'error');
      setBusyPlan(null);
    }
  };

  const cancel = async () => {
    try {
      await cancelSubscription();
      toast('Subscription will end at the period close', 'success');
      refresh();
    } catch (err) {
      toast(err.response?.data?.error || 'Could not cancel', 'error');
    }
  };

  const isActive = billing?.status === 'active' || billing?.status === 'canceling';

  if (!enabled) {
    return (
      <EmptyState
        icon={Crown}
        title="Payments are not configured"
        subtitle="Set STRIPE_SECRET_KEY on the server to enable Premium plans."
      />
    );
  }

  return (
    <div className="space-y-10 max-w-5xl">
      <div className="animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Crown className="text-amber-400" /> Musify Premium
        </h1>
        <p className="text-muted text-sm mt-1">
          Test-mode subscriptions powered by Stripe — no real money is charged. Use card
          4242&nbsp;4242&nbsp;4242&nbsp;4242 with any future expiry and any CVC.
        </p>
        {confirming && (
          <div className="mt-3 flex items-center gap-2 text-accent-bright text-sm">
            <Loader2 size={15} className="animate-spin" /> Verifying your payment with Stripe…
          </div>
        )}
        {isActive && (
          <div className="mt-4 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-400/15 to-surface-800 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold flex items-center gap-2">
                <Crown size={16} className="text-amber-400" />
                Premium {billing.plan} — {billing.status === 'canceling' ? 'ends at period close' : 'active'}
              </div>
              {billing.since && (
                <div className="text-muted text-xs mt-0.5">
                  Member since {new Date(billing.since).toLocaleDateString()}
                </div>
              )}
            </div>
            {billing.status === 'active' && (
              <button
                onClick={cancel}
                className="text-sm border border-white/20 hover:border-red-400 hover:text-red-400 rounded-full px-4 py-1.5 transition-colors"
              >
                Cancel subscription
              </button>
            )}
          </div>
        )}
      </div>

      {/* Plans */}
      {plans === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 bg-surface-800 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Free plan card */}
          <div className={`rounded-2xl border p-5 flex flex-col ${!isActive ? 'border-accent-deep bg-accent-deep/10' : 'border-white/10 bg-surface-800'}`}>
            <div className="font-bold text-lg">Free</div>
            <div className="text-2xl font-extrabold mt-1">₹0<span className="text-sm font-medium text-muted">/month</span></div>
            <ul className="mt-4 space-y-2 text-sm flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check size={15} className="text-accent mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            {!isActive && <div className="mt-4 text-center text-sm text-muted font-medium">Current plan</div>}
          </div>

          {plans.map((p) => {
            const current = isActive && billing.plan === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-5 flex flex-col ${current ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-surface-800 hover:border-accent-deep/60'} transition-colors`}
              >
                <div className="font-bold text-lg">{p.name.replace('Premium ', '')}</div>
                <div className="text-2xl font-extrabold mt-1">
                  {fmtAmount(p.amount, p.currency)}
                  <span className="text-sm font-medium text-muted">/{p.interval}</span>
                </div>
                <div className="text-muted text-xs mt-0.5">{p.tagline}</div>
                <ul className="mt-4 space-y-2 text-sm flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={15} className="text-accent mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {current ? (
                  <div className="mt-4 text-center text-sm text-amber-400 font-semibold">Current plan</div>
                ) : isSignedIn ? (
                  <button
                    onClick={() => upgrade(p.id)}
                    disabled={busyPlan !== null || isActive}
                    title={isActive ? 'Cancel your current plan first' : undefined}
                    className="mt-4 bg-accent-deep hover:bg-accent disabled:opacity-40 text-white font-semibold rounded-full py-2.5 text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {busyPlan === p.id ? <Loader2 size={15} className="animate-spin" /> : <Crown size={15} />}
                    {busyPlan === p.id ? 'Redirecting…' : 'Upgrade'}
                  </button>
                ) : (
                  <SignInButton mode="modal">
                    <button className="mt-4 bg-white text-black font-semibold rounded-full py-2.5 text-sm">
                      Sign in to upgrade
                    </button>
                  </SignInButton>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Billing history */}
      {isSignedIn && history.length > 0 && (
        <Section title="Billing history">
          <div className="bg-surface-800 border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs uppercase tracking-wider border-b border-white/10">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {history.map((inv) => (
                  <tr key={inv.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{fmtAmount(inv.amount, inv.currency)}</td>
                    <td className="px-4 py-3 capitalize">
                      <span className={inv.status === 'paid' ? 'text-emerald-400' : 'text-muted'}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.invoiceUrl && (
                        <a
                          href={inv.invoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-accent hover:underline"
                        >
                          View <ExternalLink size={13} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}
