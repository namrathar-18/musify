import Stripe from 'stripe';

// Stripe runs in TEST MODE — the key decides; no real money ever moves.
let client = null;
export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);
export const getStripe = () => {
  if (!stripeEnabled()) {
    const err = new Error('Payments are not configured');
    err.status = 503;
    throw err;
  }
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
};

// Plan catalog (INR, Spotify-India-style pricing). Prices are created ad-hoc
// via Checkout price_data, so nothing needs pre-configuring in the dashboard.
export const PLANS = {
  individual: {
    id: 'individual',
    name: 'Premium Individual',
    amount: 11900, // paise
    currency: 'inr',
    interval: 'month',
    tagline: '1 account',
    features: ['Premium badge', 'Priority AI limits', 'Early access to new features', 'Support the project'],
  },
  student: {
    id: 'student',
    name: 'Premium Student',
    amount: 5900,
    currency: 'inr',
    interval: 'month',
    tagline: '1 verified student account',
    features: ['Everything in Individual', 'Student discount'],
  },
  duo: {
    id: 'duo',
    name: 'Premium Duo',
    amount: 14900,
    currency: 'inr',
    interval: 'month',
    tagline: '2 accounts',
    features: ['Everything in Individual', 'For two people living together'],
  },
  family: {
    id: 'family',
    name: 'Premium Family',
    amount: 17900,
    currency: 'inr',
    interval: 'month',
    tagline: 'Up to 6 accounts',
    features: ['Everything in Individual', 'Up to 6 family members'],
  },
};
