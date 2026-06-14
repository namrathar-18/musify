import { requireAuth as clerkRequireAuth } from '@clerk/express';

export const requireAuth = clerkRequireAuth();

// Helper used inside controllers to extract userId (clerkUserId)
export const getUserId = (req) => {
  const userId = req.auth?.userId;
  if (!userId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  return userId;
};
