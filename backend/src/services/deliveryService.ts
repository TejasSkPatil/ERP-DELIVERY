import { Delivery } from '../models/Delivery';
import { InMemoryDatabase } from '../config/database';
import { gridfsService } from './gridfsService';
import { getKolkataDateInfo, get32DayCutoffDate } from '../utils/timeZone';

export const deliveryService = {
  create: async (data: {
    receiptNo: string;
    userId?: string;
    deliveryPersonId: string;
    fileBuffer?: Buffer;
    fileMimeType?: string;
    fileName?: string;
    status?: 'PENDING' | 'DELIVERED';
  }) => {
    const now = new Date();
    const { deliveryDate, uploadedTime } = getKolkataDateInfo(now);

    let slipFileId: any = null;

    // Stream image directly into MongoDB GridFS if fileBuffer is provided
    if (data.fileBuffer) {
      const uploadedId = await gridfsService.uploadSlip(
        data.fileBuffer,
        data.fileName || `receipt_${data.receiptNo}.jpg`,
        data.fileMimeType || 'image/jpeg',
        { receiptNo: data.receiptNo, uploadedTime }
      );

      if (uploadedId) {
        slipFileId = uploadedId;
      }
    }

    const newRecord: any = {
      receiptNo: data.receiptNo.trim().replace(/^#/, ''),
      userId: data.userId || undefined,
      deliveryPersonId: data.deliveryPersonId,
      deliveryDate,
      uploadedAt: now,
      slipFileId,
      status: data.status || 'DELIVERED',
    };

    if (InMemoryDatabase.isUsingFallback) {
      newRecord.id = `del-${Date.now()}`;
      InMemoryDatabase.deliveries.unshift(newRecord);
      return newRecord;
    } else {
      return await Delivery.create(newRecord);
    }
  },

  getToday: async () => {
    const { deliveryDate } = getKolkataDateInfo(new Date());

    let records: any[] = [];
    if (InMemoryDatabase.isUsingFallback) {
      records = InMemoryDatabase.deliveries.filter((d) => d.deliveryDate === deliveryDate);
    } else {
      try {
        records = await Delivery.find({ deliveryDate }).sort({ uploadedAt: -1 });
      } catch {
        records = InMemoryDatabase.deliveries.filter((d) => d.deliveryDate === deliveryDate);
      }
    }

    return {
      date: deliveryDate,
      totalDeliveries: records.length,
      uploadedSlips: records.filter((r) => r.slipFileId).length,
      deliveries: records,
    };
  },

  purgeOlderThan32Days: async () => {
    const cutoff = get32DayCutoffDate();
    let count = 0;

    if (InMemoryDatabase.isUsingFallback) {
      const remaining = InMemoryDatabase.deliveries.filter(
        (d) => new Date(d.uploadedAt) >= cutoff
      );
      count = InMemoryDatabase.deliveries.length - remaining.length;
      InMemoryDatabase.deliveries = remaining;
    } else {
      // Find GridFS file IDs to delete
      const oldDeliveries = await Delivery.find({ uploadedAt: { $lt: cutoff } });
      for (const item of oldDeliveries) {
        if (item.slipFileId) {
          try {
            await gridfsService.deleteSlip(item.slipFileId);
          } catch (e) {
            // file may already have been removed
          }
        }
      }
      const res = await Delivery.deleteMany({ uploadedAt: { $lt: cutoff } });
      count = res.deletedCount || oldDeliveries.length;
    }

    return count;
  },
};

export default deliveryService;
