import mongoose from 'mongoose';

const trackSchema = new mongoose.Schema(
  {
    spotifyId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    artist: { type: String, required: true },
    artistId: { type: String, default: '' },
    album: { type: String },
    albumId: { type: String, default: '' },
    albumArt: { type: String },
    previewUrl: { type: String },
    duration: { type: Number }, // ms
    genre: { type: String, default: '' },
    releaseDate: { type: String, default: '' }, // YYYY-MM-DD
    cachedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

trackSchema.index({ artist: 1, title: 1 });

export default mongoose.model('Track', trackSchema);
