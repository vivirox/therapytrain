import { Schema, model } from 'mongoose';
import { baseSchema, BaseDocument } from './base.model';

export interface SessionMetrics {
  sentiment: number;
  engagement: number;
  riskLevel: number;
  interventionSuccess: number;
}

export interface SessionDocument extends BaseDocument {
  id: string;
  clientId: string;
  mode: 'text' | 'video' | 'hybrid';
  currentBranch: string | null;
  startTime: Date;
  endTime?: Date;
  metrics: SessionMetrics;
}

const sessionSchema = new Schema({
  clientId: { type: String, required: true, index: true },
  mode: { 
    type: String, 
    required: true,
    enum: ['text', 'video', 'hybrid']
  },
  currentBranch: { type: String, default: null },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  metrics: {
    sentiment: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    riskLevel: { type: Number, default: 0 },
    interventionSuccess: { type: Number, default: 0 },
  },
}).add(baseSchema);

// Indexes
sessionSchema.index({ clientId: 1, startTime: -1 });
sessionSchema.index({ endTime: 1 }, { sparse: true });

export const Session = model<SessionDocument>('Session', sessionSchema);
