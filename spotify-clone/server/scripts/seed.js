// Seeds the Track collection with 500+ tracks from the Spotify API.
// Run with: npm run seed
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Track from '../models/Track.js';
import { searchTracksForSeed, normalizeTrack } from '../lib/itunes.js';

dotenv.config();

// We use a varied set of queries to gather a broad catalog.
// Search returns up to 50 items per call; we paginate with offset.
const SEED_QUERIES = [
  'top hits 2024',
  'top hits 2023',
  'pop',
  'rock classics',
  'hip hop',
  'r&b',
  'indie',
  'electronic dance',
  'jazz standards',
  'classical',
  'country',
  'latin pop',
  'k-pop',
  'metal',
  'folk acoustic',
];

const TARGET_COUNT = 600; // a comfortable margin above the 500 requirement

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  await connectDB();

  const collected = new Map(); // spotifyId -> normalized track

  for (const query of SEED_QUERIES) {
    if (collected.size >= TARGET_COUNT) break;

    try {
      // One call per query at the API's max page size (200). The iTunes Search
      // API is rate-limited (~20 calls/min), so we throttle between queries.
      const items = await searchTracksForSeed(query, 200, 0);
      for (const t of items) {
        if (!t || !t.trackId) continue;
        const track = normalizeTrack(t);
        if (!collected.has(track.spotifyId)) {
          collected.set(track.spotifyId, track);
        }
      }
      console.log(`"${query}": +${items.length} → collected=${collected.size}`);
    } catch (err) {
      console.warn(`Query "${query}" failed:`, err.message);
    }

    await sleep(3500);
  }

  const tracks = Array.from(collected.values());
  console.log(`Total unique tracks: ${tracks.length}`);

  if (!tracks.length) {
    console.error('No tracks collected — check your network connection to the iTunes API');
    process.exit(1);
  }

  // Bulk upsert
  const ops = tracks.map((t) => ({
    updateOne: {
      filter: { spotifyId: t.spotifyId },
      update: { $set: t },
      upsert: true,
    },
  }));
  const result = await Track.bulkWrite(ops);
  console.log(
    `Upserted: ${result.upsertedCount}, modified: ${result.modifiedCount}, matched: ${result.matchedCount}`
  );

  const total = await Track.countDocuments();
  const withPreview = await Track.countDocuments({ previewUrl: { $nin: [null, ''] } });
  console.log(`Track collection size: ${total}`);
  console.log(`Tracks with a preview_url: ${withPreview}`);
  if (withPreview === 0) {
    console.warn('\nNote: 0 tracks have a preview_url — audio playback will be disabled.\n');
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
