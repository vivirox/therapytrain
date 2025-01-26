import { Schema } from 'mongoose';

export interface BaseDocument {
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export const baseSchema = new Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret) => {
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});
