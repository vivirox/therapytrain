import mongoose from 'mongoose';

const tutorialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
  duration: { type: Number, required: true }, // in minutes
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const userProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  tutorialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutorial', required: true },
  completed: { type: Boolean, default: false },
  progress: { type: Number, default: 0 }, // percentage
  lastAccessed: { type: Date, default: Date.now }
});

const skillSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  skillName: { type: String, required: true },
  proficiency: { type: Number, required: true }, // 0 to 1
  lastUpdated: { type: Date, default: Date.now }
});

export const Tutorial = mongoose.model('Tutorial', tutorialSchema);
export const UserProgress = mongoose.model('UserProgress', userProgressSchema);
export const Skill = mongoose.model('Skill', skillSchema);
