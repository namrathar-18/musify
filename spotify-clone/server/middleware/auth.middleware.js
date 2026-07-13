// clerkMiddleware() (mounted globally in app.js) verifies the JWT and exposes the
// auth state on the request. Newer @clerk/express expose it as req.auth() (a
// function); older versions used the req.auth object. Support both.
const resolveAuth = (req) =>
  typeof req.auth === 'function' ? req.auth() : req.auth;

// Route guard: turns a missing/invalid session into a clean JSON 401 so the REST
// API contract is consistent (rather than Clerk's default HTML redirect).
export const requireAuth = (req, res, next) => {
  if (!resolveAuth(req)?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Helper used inside controllers to extract userId (clerkUserId)
export const getUserId = (req) => {
  const userId = resolveAuth(req)?.userId;
  if (!userId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  return userId;
};
