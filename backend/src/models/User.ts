import mongoose, { Schema, Model } from 'mongoose';
import { IUserDocument, UserRole } from '../types/user';

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email or username is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      select: false, // Excluded from normal query outputs
    },
    passwordHash: {
      type: String,
      select: false, // Legacy field support
    },
    role: {
      type: String,
      enum: {
        values: ['ADMIN', 'DELIVERY_PERSON'] as UserRole[],
        message: '{VALUE} is not a valid staff role. Allowed: ADMIN, DELIVERY_PERSON',
      },
      default: 'DELIVERY_PERSON',
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.passwordHash;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

export const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

export default User;
