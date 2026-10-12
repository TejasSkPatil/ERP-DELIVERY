import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IAcceptedReceipt {
  _id?: Types.ObjectId | string;
  normalizedReceiptNo: string;
  originalReceiptNo: string;
  deliveryId?: Types.ObjectId | string | null;
  acceptedAt: Date;
  imageSha256: string;
  perceptualHash?: string | null;
  uploaderId?: Types.ObjectId | string | null;
  slipFileId?: Types.ObjectId | string | null;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAcceptedReceiptDocument extends Document {
  normalizedReceiptNo: string;
  originalReceiptNo: string;
  deliveryId?: Types.ObjectId | null;
  acceptedAt: Date;
  imageSha256: string;
  perceptualHash?: string | null;
  uploaderId?: Types.ObjectId | null;
  slipFileId?: Types.ObjectId | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AcceptedReceiptSchema = new Schema<IAcceptedReceiptDocument>(
  {
    normalizedReceiptNo: {
      type: String,
      required: [true, 'normalizedReceiptNo is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    originalReceiptNo: {
      type: String,
      required: [true, 'originalReceiptNo is required'],
      trim: true,
    },
    deliveryId: {
      type: Schema.Types.ObjectId,
      ref: 'Delivery',
      default: null,
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    imageSha256: {
      type: String,
      required: [true, 'imageSha256 is required'],
      trim: true,
      index: true,
    },
    perceptualHash: {
      type: String,
      trim: true,
      index: true,
      default: null,
    },
    uploaderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    slipFileId: {
      type: Schema.Types.ObjectId,
      ref: 'fs.files',
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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

// Enforce unique index at MongoDB engine level for both normalizedReceiptNo and imageSha256
AcceptedReceiptSchema.index({ normalizedReceiptNo: 1 }, { unique: true });
AcceptedReceiptSchema.index({ imageSha256: 1 }, { unique: true });

export const AcceptedReceipt: Model<IAcceptedReceiptDocument> =
  mongoose.models.AcceptedReceipt ||
  mongoose.model<IAcceptedReceiptDocument>('AcceptedReceipt', AcceptedReceiptSchema);

export default AcceptedReceipt;
