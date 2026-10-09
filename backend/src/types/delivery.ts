import { Types, Document } from 'mongoose';

export type DeliveryStatus = 'PENDING' | 'DELIVERED';

export interface IDelivery {
  _id?: Types.ObjectId | string;
  receiptNo: string;
  recipientName?: string; // Delivery recipient information for reporting
  userId?: Types.ObjectId | string; // Optional legacy reference
  deliveryPersonId: Types.ObjectId | string;
  deliveryDate: string; // Business/calendar date e.g. "08 Oct 2026"
  uploadedAt: Date; // Exact backend timestamp
  slipFileId?: Types.ObjectId | string; // MongoDB GridFS file ID
  status: DeliveryStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDeliveryDocument extends Document {
  receiptNo: string;
  recipientName?: string;
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
  recipientName?: string;
  userId?: string;
  deliveryPersonId: string;
  deliveryDate?: string;
  slipFileId?: Types.ObjectId | string;
  status?: DeliveryStatus;
}
