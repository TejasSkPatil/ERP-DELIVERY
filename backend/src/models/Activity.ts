import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../types/user';

export type ActivityAction = 'LOGIN' | 'LOGOUT' | 'SIGNUP';

export interface IActivity extends Document {
  action: ActivityAction;
  userId?: mongoose.Types.ObjectId | string;
  userName: string;
  userRole: UserRole;
  description: string;
  ip?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    action: {
      type: String,
      enum: ['LOGIN', 'LOGOUT', 'SIGNUP'],
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userRole: {
      type: String,
      enum: ['ADMIN', 'DELIVERY_PERSON'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index on timestamp for quick chronological retrieval
ActivitySchema.index({ timestamp: -1 });

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
export default Activity;
