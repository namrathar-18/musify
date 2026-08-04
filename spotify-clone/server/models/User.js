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

    // Gamification
    xp: { type: Number, default: 0 },
    badges: [{ type: String }], // badge ids from lib/gamification.js
    quizHighScore: { type: Number, default: 0 },
    quizGamesPlayed: { type: Number, default: 0 },

    // Public profile / onboarding
    username: { type: String, unique: true, sparse: true, index: true },
    bio: { type: String, default: '' },
    isPublic: { type: Boolean, default: true },
    favoriteGenres: [{ type: String }],
    onboarded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
