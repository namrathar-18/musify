// Tiny in-memory TTL cache. On serverless this lives for the lifetime of a warm
// lambda, which is exactly what we want for chart/feed data that changes daily —
// it saves the upstream round-trip without needing extra infrastructure.
const store = new Map();

export const cached = async (key, ttlMs, fetcher) => {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const value = await fetcher();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
};
