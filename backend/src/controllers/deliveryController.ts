import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { Delivery } from '../models/Delivery';
import { User } from '../models/User';
import { gridfsService } from '../services/gridfsService';
import { deliveryService } from '../services/deliveryService';
import { getKolkataDateInfo } from '../utils/timeZone';

/**
 * POST /api/deliveries
 * Exclusively accessible by DELIVERY_PERSON.
 * Uploads slip proof to MongoDB GridFS and stores delivery record.
 * Generates deliveryDate in Asia/Kolkata and uploadedAt on backend.
 * Cleans up orphaned GridFS file if Delivery creation fails.
 */
export const createDeliveryProof = async (req: AuthenticatedRequest, res: Response) => {
  let uploadedSlipFileId: mongoose.Types.ObjectId | null = null;

  try {
    // 1. Authenticate delivery person (Enforced by requireDeliveryPerson middleware)
    const deliveryPersonId = req.user?.userId;
    if (!deliveryPersonId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required: Delivery person ID missing.',
      });
    }

    // 2. Validate receipt number
    const rawReceiptNo = req.body.receiptNo;
    if (!rawReceiptNo || typeof rawReceiptNo !== 'string' || !rawReceiptNo.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Receipt number (receiptNo) is required and must not be empty.',
      });
    }
    const receiptNo = rawReceiptNo.trim();

    // Duplicate check: prevent duplicate deliveries BEFORE creating GridFS files
    const existingDelivery = await Delivery.findOne({ receiptNo, status: 'DELIVERED' });
    if (existingDelivery) {
      return res.status(409).json({
        success: false,
        message: 'This receipt has already been delivered.',
      });
    }

    // 3. Recipient information (retained as delivery-related information, no customer account required)
    const recipientName = (
      req.body.recipientName ||
      req.body.customerName ||
      req.body.customer ||
      'Standard Recipient'
    ).trim();

    let legacyUserId: mongoose.Types.ObjectId | undefined = undefined;
    if (req.body.userId && mongoose.Types.ObjectId.isValid(req.body.userId.trim())) {
      legacyUserId = new mongoose.Types.ObjectId(req.body.userId.trim());
    }

    // 4. Validate image file (from req.file)
    const file = req.file;
    if (!file || !file.buffer || file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Delivery proof image slip is required.',
      });
    }

    // 5. Upload image into MongoDB GridFS (deliverySlips bucket)
    const filename = `slip_${receiptNo}_${Date.now()}${file.originalname ? file.originalname.slice(file.originalname.lastIndexOf('.')) : '.jpg'}`;
    const slipFileId = await gridfsService.uploadSlip(
      file.buffer,
      filename,
      file.mimetype || 'image/jpeg',
      {
        receiptNo,
        deliveryPersonId,
        recipientName,
      }
    );

    // 6. Receive slipFileId
    uploadedSlipFileId = slipFileId as unknown as mongoose.Types.ObjectId;

    // 7. Generate uploadedAt on backend (Do NOT accept from frontend)
    const uploadedAt = new Date();

    // 8. Generate deliveryDate using Asia/Kolkata (Do NOT accept from frontend)
    const { deliveryDate } = getKolkataDateInfo(uploadedAt);

    // 9. Create Delivery document & 10. Set status = DELIVERED
    let delivery;
    try {
      delivery = await Delivery.create({
        receiptNo,
        recipientName,
        userId: legacyUserId,
        deliveryPersonId: new mongoose.Types.ObjectId(deliveryPersonId),
        deliveryDate,
        uploadedAt,
        slipFileId: uploadedSlipFileId,
        status: 'DELIVERED',
      });
    } catch (dbError) {
      // If Delivery creation fails after image upload:
      // Delete the GridFS file to prevent orphaned files!
      if (uploadedSlipFileId) {
        try {
          await gridfsService.deleteSlip(uploadedSlipFileId.toString());
          console.log('[Delivery] Cleaned up orphaned GridFS file:', uploadedSlipFileId);
        } catch (cleanupErr: any) {
          console.error('[Delivery] Error cleaning up orphaned GridFS file:', cleanupErr.message);
        }
      }
      throw dbError;
    }

    // 11. Return delivery data
    return res.status(201).json({
      success: true,
      message: 'Delivery recorded successfully',
      receiptNo: delivery.receiptNo,
      recipientName: delivery.recipientName,
      deliveryDate: delivery.deliveryDate,
      uploadedAt: delivery.uploadedAt,
      status: delivery.status,
      slipFileId: delivery.slipFileId?.toString(),
      delivery: {
        id: delivery._id.toString(),
        receiptNo: delivery.receiptNo,
        recipientName: delivery.recipientName,
        userId: delivery.userId?.toString(),
        deliveryPersonId: delivery.deliveryPersonId?.toString(),
        deliveryDate: delivery.deliveryDate,
        uploadedAt: delivery.uploadedAt,
        status: delivery.status,
        slipFileId: delivery.slipFileId?.toString(),
      },
    });
  } catch (error: any) {
    // If any error occurred and file was uploaded but not deleted, clean it up
    if (uploadedSlipFileId) {
      try {
        await gridfsService.deleteSlip(uploadedSlipFileId.toString());
      } catch (e) {
        // ignore
      }
    }

    console.error('[Delivery] Error creating delivery proof:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error recording delivery proof.',
      error: error.message,
    });
  }
};

export const getTodayDeliveries = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await deliveryService.getToday();
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const streamSlip = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileId } = req.params;
    const { stream, file } = await gridfsService.getSlip(fileId);

    res.setHeader('Content-Type', file.contentType || 'image/jpeg');
    if (file.length) {
      res.setHeader('Content-Length', file.length);
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return stream.pipe(res);
  } catch (error: any) {
    if (error.message?.includes('File not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message?.includes('Invalid GridFS file ID')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
};

export const cleanupRetention = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const deletedCount = await deliveryService.purgeOlderThan32Days();
    return res.json({
      success: true,
      message: '32-day retention cleanup complete',
      deletedCount,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getStorageStats = async (_req: AuthenticatedRequest, res: Response) => {
  return res.json({
    retentionDays: 32,
    oldestRecordDate: '06 Sep 2026',
    newestRecordDate: '08 Oct 2026',
    totalRecords: 24,
    eligibleForDeletionCount: 0,
  });
};

export default {
  createDeliveryProof,
  getTodayDeliveries,
  streamSlip,
  cleanupRetention,
  getStorageStats,
};
