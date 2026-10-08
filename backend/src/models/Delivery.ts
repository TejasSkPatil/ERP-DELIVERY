import mongoose, { Schema, Model } from 'mongoose';
import { IDeliveryDocument, DeliveryStatus } from '../types/delivery';

const DeliverySchema = new Schema<IDeliveryDocument>(
  {
    receiptNo: {
      type: String,
      required: [true, 'receiptNo is required'],
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    deliveryPersonId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    deliveryDate: {
      type: String, // Business/calendar date e.g. "2026-10-08"
      required: [true, 'deliveryDate is required'],
      trim: true,
      index: true,
    },
    uploadedAt: {
      type: Date, // Exact backend timestamp
      default: Date.now,
      required: true,
      index: true,
    },
    slipFileId: {
      type: Schema.Types.ObjectId, // MongoDB GridFS file ID
      ref: 'fs.files',
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'DELIVERED'] as DeliveryStatus[],
        message: '{VALUE} is not a valid delivery status',
      },
      default: 'PENDING',
      required: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Delivery: Model<IDeliveryDocument> =
  mongoose.models.Delivery ||
  mongoose.model<IDeliveryDocument>('Delivery', DeliverySchema);

export default Delivery;
