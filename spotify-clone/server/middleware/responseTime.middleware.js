// Logs request duration to stdout and stamps X-Response-Time header.
// Used for measuring/proving the <200ms claim for cached endpoints.
export const responseTime = (req, res, next) => {
  const start = process.hrtime.bigint();

  // Set header just before headers are sent so client can read it
  const origJson = res.json.bind(res);
  res.json = (body) => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1_000_000;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
    }
    return origJson(body);
  };

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1_000_000;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(2)}ms`
    );
  });

  next();
};
