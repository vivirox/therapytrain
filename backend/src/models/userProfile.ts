import { Schema, model } from 'mongoose';
import { UserProfile } from '../../../src/types/database.types';

const userProfileSchema = new Schema<UserProfile>(
  {
    userId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    skills: {
      type: Map,
      of: Number,
      default: {},
    },
    preferences: {
      theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
      notifications: { type: Boolean, default: true },
      language: { type: String, default: 'en' },
    },
  },
  { timestamps: true }
);

// Index for faster queries
userProfileSchema.index({ userId: 1 }, { unique: true });
userProfileSchema.index({ email: 1 }, { unique: true });

export const UserProfileModel = model<UserProfile>('UserProfile', userProfileSchema);
