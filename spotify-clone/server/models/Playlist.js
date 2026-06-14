import mongoose from 'mongoose';

const playlistTrackSchema = new mongoose.Schema(
  {
    spotifyTrackId: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const playlistSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true }, // clerkUserId
    name: { type: String, required: true },
    description: { type: String, default: '' },
    tracks: { type: [playlistTrackSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Playlist', playlistSchema);
