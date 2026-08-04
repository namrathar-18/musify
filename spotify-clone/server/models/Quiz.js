import mongoose from 'mongoose';

// A dealt quiz round. Correct answers live only here (never sent to the
// client), so scoring can't be spoofed — the client posts its picks and the
// server grades them. Rounds self-destruct after 30 minutes.
const quizSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  answers: [{ type: String }], // correct option index per question, as strings
  scored: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 1800 },
});

export default mongoose.model('Quiz', quizSchema);
