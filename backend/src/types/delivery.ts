import { Types, Document } from 'mongoose';

export type DeliveryStatus = 'PENDING' | 'DELIVERED';

export interface IDelivery {
  _id?: Types.ObjectId | string;
  receiptNo: string;
  userId?: Types.ObjectId | string;
  deliveryPersonId: Types.ObjectId | string;
  deliveryDate: string; // Business/calendar date e.g. "2026-10-08"
  uploadedAt: Date; // Exact backend timestamp
  slipFileId?: Types.ObjectId | string; // MongoDB GridFS file ID
  status: DeliveryStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDeliveryDocument extends Document {
  receiptNo: string;
  userId?: Types.ObjectId;
  deliveryPersonId: Types.ObjectId;
  deliveryDate: string;
  uploadedAt: Date;
  slipFileId?: Types.ObjectId;
  status: DeliveryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliveryInput {
  receiptNo: string;
  userId?: string;
  deliveryPersonId: string;
  deliveryDate?: string;
  slipFileId?: Types.ObjectId | string;
  status?: DeliveryStatus;
}
