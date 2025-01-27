import { Schema, model } from 'mongoose';
import { ClientProfile } from '../../../src/types/database.types';

const clientProfileSchema = new Schema<ClientProfile>(
  {
    age: { type: Number, required: true },
    background: { type: String, required: true },
    category: { type: String, required: true },
    complexity: { type: String, required: true },
    description: { type: String, required: true },
    keyTraits: [{ type: String }],
    name: { type: String, required: true },
    primaryIssue: { type: String, required: true },
    userId: { type: String, required: true },
  },
  { timestamps: true }
);

// Index for faster queries
clientProfileSchema.index({ userId: 1 });
clientProfileSchema.index({ category: 1 });
clientProfileSchema.index({ complexity: 1 });

export const ClientProfileModel = model<ClientProfile>('ClientProfile', clientProfileSchema);
