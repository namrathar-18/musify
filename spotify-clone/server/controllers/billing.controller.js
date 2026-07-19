import User from '../models/User.js';
import { getUserId } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { getStripe, stripeEnabled, PLANS } from '../lib/stripe.js';

const appOrigin = () => process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const bad = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// Activate premium on a user document from a verified Stripe subscription
const activate = async (userId, plan, { customerId, subscriptionId }) => {
  await User.updateOne(
    { clerkUserId: userId },
    {
      $set: {
        premiumPlan: plan,
        premiumStatus: 'active',
        stripeCustomerId: customerId || '',
        stripeSubscriptionId: subscriptionId || '',
        premiumSince: new Date(),
      },
    }
  );
};

const deactivate = async (query) => {
  await User.updateOne(query, {
    $set: { premiumPlan: 'free', premiumStatus: 'none', stripeSubscriptionId: '' },
  });
};

// GET /api/billing/plans — public catalog
export const listPlans = (req, res) => {
  res.json({ enabled: stripeEnabled(), plans: Object.values(PLANS) });
};

// GET /api/billing/status
export const status = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const user = await User.findOne({ clerkUserId: userId }).lean();
  res.json({
    plan: user?.premiumPlan || 'free',
    status: user?.premiumStatus || 'none',
    since: user?.premiumSince || null,
  });
});

// POST /api/billing/checkout  { plan }
export const createCheckout = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const plan = PLANS[req.body.plan];
  if (!plan) throw bad('Unknown plan');

  const user = await User.findOne({ clerkUserId: userId }).lean();
  if (user?.premiumStatus === 'active') throw bad('You already have an active subscription');

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    client_reference_id: userId,
    customer_email: user?.email || undefined,
    metadata: { userId, plan: plan.id },
    subscription_data: { metadata: { userId, plan: plan.id } },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: plan.currency,
          unit_amount: plan.amount,
          recurring: { interval: plan.interval },
          product_data: {
            name: `Musify ${plan.name}`,
            description: plan.tagline,
          },
        },
      },
    ],
    success_url: `${appOrigin()}/premium?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appOrigin()}/premium?status=cancelled`,
  });

  res.json({ url: session.url });
});

// POST /api/billing/confirm  { sessionId }
// Server-side verification on return from Checkout: we fetch the session
// straight from Stripe with the secret key — nothing from the client is
// trusted beyond the opaque session id. (Webhooks below do the same job when
// a webhook secret is configured; this path needs zero dashboard setup.)
export const confirmCheckout = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const sessionId = String(req.body.sessionId || '');
  if (!sessionId.startsWith('cs_')) throw bad('Invalid session id');

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.metadata?.userId !== userId) throw bad('Session does not belong to you', 403);
  if (session.payment_status !== 'paid') throw bad('Payment not completed');

  const plan = PLANS[session.metadata.plan] ? session.metadata.plan : 'individual';
  await activate(userId, plan, {
    customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
    subscriptionId:
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
  });

  res.json({ plan, status: 'active' });
});

// POST /api/billing/cancel — cancels at period end
export const cancelSubscription = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const user = await User.findOne({ clerkUserId: userId }).lean();
  if (!user?.stripeSubscriptionId) throw bad('No active subscription');

  const stripe = getStripe();
  await stripe.subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
  await User.updateOne({ clerkUserId: userId }, { $set: { premiumStatus: 'canceling' } });

  res.json({ status: 'canceling' });
});

// GET /api/billing/history — invoice list for the user's Stripe customer
export const billingHistory = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const user = await User.findOne({ clerkUserId: userId }).lean();
  if (!user?.stripeCustomerId) return res.json({ items: [] });

  const stripe = getStripe();
  const invoices = await stripe.invoices.list({ customer: user.stripeCustomerId, limit: 12 });
  res.json({
    items: invoices.data.map((inv) => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toISOString(),
      amount: inv.amount_paid ?? inv.amount_due,
      currency: inv.currency,
      status: inv.status,
      invoiceUrl: inv.hosted_invoice_url || null,
      pdf: inv.invoice_pdf || null,
    })),
  });
});

// POST /api/billing/webhook — signature-verified Stripe events.
// Mounted with express.raw BEFORE the JSON body parser (see app.js). Active
// only when STRIPE_WEBHOOK_SECRET is configured in the dashboard + env.
export const webhook = async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(501).json({ error: 'Webhook not configured' });

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook verification failed: ${err.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      if (s.metadata?.userId && s.payment_status === 'paid') {
        await activate(s.metadata.userId, PLANS[s.metadata.plan] ? s.metadata.plan : 'individual', {
          customerId: s.customer,
          subscriptionId: s.subscription,
        });
      }
    } else if (event.type === 'customer.subscription.deleted') {
      await deactivate({ stripeSubscriptionId: event.data.object.id });
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handling failed:', err.message);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
};
