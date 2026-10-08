import mongoose, { Schema, Document } from 'mongoose';

export interface IDelivery extends Document {
  receiptNo: string;
  deliveryPersonId: string;
  deliveryPersonName: string;
  customerId?: string;
  customerName: string;
  deliveryDate: string; // "07 Oct 2026"
  uploadedTime: string; // "14:32:15 IST"
  uploadedTimestamp: Date; // Real Date for 32-day retention calculations
  status: 'Completed' | 'Pending';
  slipImageUrl: string; // Base64 data URI or asset URL stored directly in MongoDB
  imageMimeType?: string;
  imageSize?: number;
}

const DeliverySchema = new Schema<IDelivery>({
  receiptNo: { type: String, required: true },
  deliveryPersonId: { type: String, required: true },
  deliveryPersonName: { type: String, required: true },
  customerId: { type: String },
  customerName: { type: String, required: true },
  deliveryDate: { type: String, required: true },
  uploadedTime: { type: String, required: true },
  uploadedTimestamp: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['Completed', 'Pending'], default: 'Completed' },
  slipImageUrl: { type: String, required: true },
  imageMimeType: { type: String },
  imageSize: { type: Number },
});

export const Delivery = mongoose.model<IDelivery>('Delivery', DeliverySchema);
