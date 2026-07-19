import mongoose from 'mongoose';

const recentPlaySchema = new mongoose.Schema(
  {
    spotifyTrackId: { type: String, required: true },
    playedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    clerkUserId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    displayName: { type: String },
    likedSongs: [{ type: String }], // array of spotifyTrackIds
    recentlyPlayed: { type: [recentPlaySchema], default: [] },
    // Premium subscription (managed via Stripe test mode)
    premiumPlan: { type: String, default: 'free' }, // free | individual | student | duo | family
    premiumStatus: { type: String, default: 'none' }, // none | active | canceling
    stripeCustomerId: { type: String, default: '' },
    stripeSubscriptionId: { type: String, default: '' },
    premiumSince: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
