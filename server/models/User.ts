import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'ADMIN' | 'DELIVERY_PERSON' | 'USER';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['ADMIN', 'DELIVERY_PERSON', 'USER'],
    default: 'USER',
  },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>('User', UserSchema);
