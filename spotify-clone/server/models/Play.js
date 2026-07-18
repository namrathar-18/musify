import mongoose from 'mongoose';

// One document per play event. Track fields are denormalized (snapshotted) so
// stats aggregations never need a join, and history survives catalog changes.
const playSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    spotifyId: { type: String, required: true },
    title: { type: String, default: '' },
    artist: { type: String, default: '' },
    artistId: { type: String, default: '' },
    genre: { type: String, default: '' },
    albumArt: { type: String, default: '' },
    // What was actually listenable — previews cap at 30s, so listening-time
    // stats stay honest instead of counting full track lengths.
    listenedMs: { type: Number, default: 30000 },
    playedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

playSchema.index({ userId: 1, playedAt: -1 });

export default mongoose.model('Play', playSchema);
