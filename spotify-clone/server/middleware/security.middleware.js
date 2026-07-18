// Baseline security headers for every response. (A strict CSP is intentionally
// omitted: artwork/audio stream from many third-party podcast hosts, which a
// static allowlist would break.)
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
};

// Per-IP sliding-window limit. In-memory (per serverless instance) — a soft
// cap that stops bursts and abuse loops without external infrastructure.
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 120;
const hits = new Map();

export const rateLimit = (req, res, next) => {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests — slow down' });
  }
  recent.push(now);
  hits.set(ip, recent);
  // Opportunistic cleanup so the map doesn't grow unbounded
  if (hits.size > 10000) hits.clear();
  next();
};
