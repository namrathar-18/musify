// Seeds the Track collection with 500+ tracks from the Spotify API.
// Run with: npm run seed
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Track from '../models/Track.js';
import { searchTracksForSeed, normalizeTrack } from '../lib/spotify.js';

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

const run = async () => {
  await connectDB();

  const collected = new Map(); // spotifyId -> normalized track

  for (const query of SEED_QUERIES) {
    if (collected.size >= TARGET_COUNT) break;

    // Two pages per query = up to 100 tracks each
    for (const offset of [0, 50]) {
      if (collected.size >= TARGET_COUNT) break;
      try {
        const items = await searchTracksForSeed(query, 50, offset);
        for (const t of items) {
          if (!t || !t.id) continue;
          if (!collected.has(t.id)) {
            collected.set(t.id, normalizeTrack(t));
          }
        }
        console.log(`"${query}" offset=${offset}: collected=${collected.size}`);
      } catch (err) {
        console.warn(`Query "${query}" offset=${offset} failed:`, err.message);
      }
    }
  }

  const tracks = Array.from(collected.values());
  console.log(`Total unique tracks: ${tracks.length}`);

  if (!tracks.length) {
    console.error('No tracks collected — check Spotify credentials in .env');
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
    console.warn(
      '\nNote: 0 tracks have preview_url. This is expected for newer Spotify apps\n' +
        '(Spotify deprecated preview_url for new apps in Nov 2024). Older apps still get them.\n'
    );
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
