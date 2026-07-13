import mongoose from 'mongoose';

// Cache the connection across (serverless) invocations so we never open a new
// socket per request. On Vercel each warm lambda reuses `global._mongoose`.
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { bufferCommands: false })
      .then((m) => {
        console.log('MongoDB connected');
        return m;
      })
      .catch((err) => {
        // Reset so the next request can retry instead of caching a failure
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};
