import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Environment must be in place before the app (and Clerk middleware) load.
let mongod;
let app;
let Track;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('musify-test');
  process.env.CLERK_PUBLISHABLE_KEY =
    'pk_test_' + Buffer.from('example.clerk.accounts.dev$').toString('base64');
  process.env.CLERK_SECRET_KEY = 'sk_test_dummydummydummydummydummydummy';

  ({ default: app } = await import('../app.js'));
  ({ default: Track } = await import('../models/Track.js'));

  // app.js's dotenv may have loaded a real key from .env — aiEnabled() reads
  // the env per call, so clearing here makes the status deterministic.
  delete process.env.GROQ_API_KEY;

  // Seed a small catalog directly through the model
  await mongoose.connect(process.env.MONGODB_URI);
  await Track.insertMany(
    Array.from({ length: 25 }, (_, i) => ({
      spotifyId: `id-${i}`,
      title: `Track ${i}`,
      artist: `Artist ${i % 5}`,
      album: `Album ${i % 3}`,
      albumArt: '',
      previewUrl: 'https://example.com/p.m4a',
      duration: 200000,
      genre: i % 2 ? 'Pop' : 'Rock',
    }))
  );
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

describe('public endpoints', () => {
  it('GET /api/health returns ok with response-time header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['x-response-time']).toMatch(/ms$/);
  });

  it('unknown /api route returns JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  it('GET /api/songs paginates the catalog', async () => {
    const res = await request(app).get('/api/songs?page=2&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(10);
    expect(res.body.total).toBe(25);
    expect(res.body.totalPages).toBe(3);
    expect(res.body.page).toBe(2);
  });

  it('GET /api/songs caps limit at 100 and floors page at 1', async () => {
    const res = await request(app).get('/api/songs?page=-5&limit=9999');
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(100);
  });

  it('GET /api/songs/:id serves a cached track', async () => {
    const res = await request(app).get('/api/songs/id-3');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Track 3');
  });

  it('GET /api/ai/status reports disabled without a key', async () => {
    const res = await request(app).get('/api/ai/status');
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);
  });

  it('sets baseline security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });
});

describe('auth gating', () => {
  const protectedRoutes = [
    ['get', '/api/users/me'],
    ['get', '/api/users/me/liked'],
    ['get', '/api/users/me/stats'],
    ['get', '/api/playlists'],
    ['post', '/api/playlists'],
    ['post', '/api/ai/chat'],
    ['post', '/api/ai/playlist'],
    ['post', '/api/ai/search'],
  ];

  it.each(protectedRoutes)('%s %s returns JSON 401 when signed out', async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});
