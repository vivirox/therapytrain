import { Schema, model } from 'mongoose';
import { baseSchema, BaseDocument } from './base.model';

export interface SessionBranchDocument extends BaseDocument {
  id: string;
  sessionId: string;
  condition: string;
  nextAction: string;
  probability: number;
  triggered: boolean;
}

const sessionBranchSchema = new Schema({
  sessionId: { 
    type: String, 
    required: true,
    index: true
  },
  condition: { 
    type: String, 
    required: true 
  },
  nextAction: { 
    type: String, 
    required: true 
  },
  probability: { 
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  triggered: { 
    type: Boolean,
    default: false
  },
}).add(baseSchema);

// Indexes
sessionBranchSchema.index({ sessionId: 1, triggered: 1 });

export const SessionBranch = model<SessionBranchDocument>('SessionBranch', sessionBranchSchema);
