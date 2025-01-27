import { Schema, model } from 'mongoose';
import { Session } from '../../../src/types/database.types';

const sessionSchema = new Schema<Session>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'ClientProfile', required: true },
    userId: { type: String, required: true },
    mode: { type: String, enum: ['text', 'video'], required: true },
    status: { type: String, enum: ['active', 'completed'], required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    metrics: {
      sentiment: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
    },
    messages: [{
      role: { type: String, enum: ['user', 'assistant'], required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, required: true },
    }],
  },
  { timestamps: true }
);

// Indexes for faster queries
sessionSchema.index({ userId: 1 });
sessionSchema.index({ clientId: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ startTime: -1 });

export const SessionModel = model<Session>('Session', sessionSchema);
