import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  kindeId: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema({
  kindeId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: String,
}, {
  timestamps: true,
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
