import { Delivery } from '../models/Delivery';
import { AcceptedReceipt } from '../models/AcceptedReceipt';
import { InMemoryDatabase } from '../config/database';
import { gridfsService } from './gridfsService';
import { getKolkataDateInfo, get32DayCutoffDate } from '../utils/timeZone';
import { normalizeSlipNumber } from '../utils/normalize-slip-number';
import { calculateImageSha256, isImageDuplicate } from './image-hash.service';
import { calculatePerceptualHash, checkPerceptualDuplicate } from './perceptual-hash.service';
import { isReceiptRegistered, registerReceipt } from './receiptRegistry.service';

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
    const rawReceiptNo = data.receiptNo || '';
    const normalizedReceiptNo = normalizeSlipNumber(rawReceiptNo);
    if (!normalizedReceiptNo) {
      throw new Error('A valid receipt number is required.');
    }

    // Check permanent registry before proceeding
    if (await isReceiptRegistered(normalizedReceiptNo)) {
      throw new Error('This receipt has already been delivered.');
    }

    const now = new Date();
    const { deliveryDate, uploadedTime } = getKolkataDateInfo(now);

    let imageSha256: string | null = null;
    let perceptualHash: string | null = null;
    let perceptualMatchDetected = false;
    let perceptualMatches: any[] = [];
    let acceptedReceiptDoc: any = null;
    let slipFileId: any = null;

    if (data.fileBuffer) {
      // 5. Compute SHA-256 hash of original image bytes
      imageSha256 = calculateImageSha256(data.fileBuffer);

      // 6. Check exact-image hash
      if (await isImageDuplicate(imageSha256)) {
        throw new Error('This delivery slip image has already been uploaded and processed.');
      }

      // 7. Check perceptual hash for likely modified copies
      try {
        perceptualHash = await calculatePerceptualHash(data.fileBuffer);
        const pCheck = await checkPerceptualDuplicate(perceptualHash);
        perceptualMatchDetected = pCheck.hasLikelyMatch;
        perceptualMatches = pCheck.matches;
      } catch (pErr: any) {
        console.warn('[DeliveryService] Perceptual hash calculation warning:', pErr.message);
      }

      // 8. Safely reserve receipt number and exact image hash
      try {
        acceptedReceiptDoc = await registerReceipt({
          normalizedReceiptNo,
          originalReceiptNo: rawReceiptNo.trim(),
          imageSha256,
          perceptualHash,
          acceptedAt: now,
          uploaderId: data.deliveryPersonId,
          slipFileId: null,
          metadata: {
            status: 'RESERVED',
            perceptualMatchDetected,
            perceptualMatches,
          },
        });
      } catch (registryErr: any) {
        if (registryErr.code === 11000 || registryErr.message?.includes('E11000')) {
          const isImageDup =
            registryErr.message?.includes('imageSha256') ||
            registryErr.keyPattern?.imageSha256;
          throw new Error(
            isImageDup
              ? 'This delivery slip image has already been uploaded and processed.'
              : 'This receipt has already been delivered.'
          );
        }
        throw registryErr;
      }

      // 9. Upload image into MongoDB GridFS
      try {
        const uploadedId = await gridfsService.uploadSlip(
          data.fileBuffer,
          data.fileName || `receipt_${normalizedReceiptNo}.jpg`,
          data.fileMimeType || 'image/jpeg',
          { receiptNo: normalizedReceiptNo, uploadedTime, imageSha256, perceptualHash }
        );

        if (uploadedId) {
          slipFileId = uploadedId;
        }
      } catch (uploadErr) {
        // Rollback reservation if GridFS upload fails
        if (acceptedReceiptDoc?._id) {
          try {
            await AcceptedReceipt.deleteOne({ _id: acceptedReceiptDoc._id });
          } catch {}
        }
        throw uploadErr;
      }
    }

    // 10. Create Delivery record and link to permanent registry
    const newRecord: any = {
      receiptNo: normalizedReceiptNo,
      userId: data.userId || undefined,
      deliveryPersonId: data.deliveryPersonId,
      deliveryDate,
      uploadedAt: now,
      slipFileId,
      status: data.status || 'DELIVERED',
    };

    let savedDelivery: any;
    try {
      if (InMemoryDatabase.isUsingFallback) {
        newRecord.id = `del-${Date.now()}`;
        InMemoryDatabase.deliveries.unshift(newRecord);
        savedDelivery = newRecord;
      } else {
        savedDelivery = await Delivery.create(newRecord);
      }

      // Link deliveryId and slipFileId to AcceptedReceipt record
      if (acceptedReceiptDoc?._id) {
        try {
          await AcceptedReceipt.updateOne(
            { _id: acceptedReceiptDoc._id },
            {
              deliveryId: savedDelivery._id,
              slipFileId,
              $set: { 'metadata.status': 'ACCEPTED' },
            }
          );
        } catch {}
      }

      return savedDelivery;
    } catch (dbError) {
      // Rollback reservation and cleanup orphaned GridFS file
      if (acceptedReceiptDoc?._id) {
        try {
          await AcceptedReceipt.deleteOne({ _id: acceptedReceiptDoc._id });
        } catch {}
      }
      if (slipFileId) {
        try {
          await gridfsService.deleteSlip(slipFileId.toString());
        } catch {}
      }
      throw dbError;
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
