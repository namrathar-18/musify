// Vercel serverless entry point. An Express app is itself a (req, res) handler,
// so exporting it directly lets Vercel route every /api/* request through the
// full Express stack (CORS, Clerk, response-time, routers, error handler).
import app from '../server/app.js';

export default app;
