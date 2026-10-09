export * from '../../backend/src/types/delivery';

export interface DeliveryRecord {
  id: string;
  receiptNo: string;
  recipientName?: string;
  customer?: string; // UI alias for recipient name
  deliveryPerson?: string;
  deliveryPersonId?: string;
  deliveryDate: string;
  uploadedTime?: string;
  uploadedAt?: string | Date;
  status: 'Completed' | 'Pending' | 'DELIVERED';
  slipFileId?: string | null;
  slipImageUrl?: string;
}

export interface NewDeliveryInput {
  receiptNo: string;
  customer: string;
  slipFile?: File | null;
  slipPreviewUrl?: string;
}

export interface DailyStat {
  date: string;
  totalDeliveries: number;
  uploadedSlips: number;
  isToday?: boolean;
}

export interface StorageStats {
  retentionDays: number;
  oldestRecordDate: string;
  newestRecordDate: string;
  eligibleForDeletionCount: number;
}

export interface DeliveryPersonStat {
  id: string;
  name: string;
  email: string;
  role: 'DELIVERY_PERSON';
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  totalDeliveries: number;
  totalSlips: number;
  todayDeliveries: number;
  todaySlips: number;
  lastDeliveryAt: string | Date | null;
  createdAt?: string | Date;
}
