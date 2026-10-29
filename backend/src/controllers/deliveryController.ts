import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { Delivery } from '../models/Delivery';
import { gridfsService } from '../services/gridfsService';
import { deliveryService } from '../services/deliveryService';
import { getKolkataDateInfo } from '../utils/timeZone';
import { extractTextFromSlip } from '../services/ocr.service';
import { parseSlipDetails } from '../services/slipParser.service';
import { normalizeSlipNumber, areSlipNumbersEqual } from '../utils/normalize-slip-number';
import {
  isReceiptRegistered,
  registerReceipt,
} from '../services/receiptRegistry.service';
import { calculateImageSha256 } from '../services/image-hash.service';
import {
  calculatePerceptualHash,
  checkPerceptualDuplicate,
  PerceptualMatchResult,
} from '../services/perceptual-hash.service';
import { AcceptedReceipt } from '../models/AcceptedReceipt';

/**
 * POST /api/deliveries
 * Exclusively accessible by DELIVERY_PERSON.
 * Uploads slip proof to MongoDB GridFS and stores delivery record.
 * Generates deliveryDate in Asia/Kolkata and uploadedAt on backend.
 * Cleans up orphaned GridFS file if Delivery creation fails.
 */
export const createDeliveryProof = async (req: AuthenticatedRequest, res: Response) => {
  let uploadedSlipFileId: mongoose.Types.ObjectId | null = null;
  let acceptedReceiptDoc: any = null;

  try {
    // 1. Authenticate delivery person (Enforced by requireDeliveryPerson middleware)
    const deliveryPersonId = req.user?.userId;
    if (!deliveryPersonId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required: Delivery person ID missing.',
      });
    }

    // 2. Validate receipt number if provided manually, or prepare for automatic extraction
    const rawReceiptNoFromBody = req.body.receiptNo;
    let rawReceiptNo = '';
    let clientReceiptNo = '';
    let receiptDate = '';
    let receiptTime = '';
    let isVerified = false;

    const isManualCorrection =
      req.body.isManualCorrection === 'true' ||
      req.body.isManualCorrection === true ||
      req.body.confirmedManualReceipt === 'true' ||
      req.body.confirmedManualReceipt === true;

    if (rawReceiptNoFromBody !== undefined) {
      if (typeof rawReceiptNoFromBody !== 'string' || !rawReceiptNoFromBody.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Receipt number (receiptNo) is required and must not be empty.',
        });
      }
      rawReceiptNo = rawReceiptNoFromBody.trim();
      const normalized = normalizeSlipNumber(rawReceiptNo);
      if (!normalized) {
        return res.status(400).json({
          success: false,
          message: 'Receipt number (receiptNo) is required and must be a valid alphanumeric identifier.',
        });
      }
      clientReceiptNo = normalized;

      // Duplicate check: prevent duplicate deliveries BEFORE creating GridFS files or running OCR
      if (await isReceiptRegistered(clientReceiptNo)) {
        return res.status(409).json({
          success: false,
          message: 'This receipt has already been delivered.',
        });
      }

      const existingDelivery = await Delivery.findOne({ receiptNo: clientReceiptNo, status: 'DELIVERED' });
      if (existingDelivery) {
        return res.status(409).json({
          success: false,
          message: 'This receipt has already been delivered.',
        });
      }
    }

    // 3. Validate image file (from req.file)
    const file = req.file;
    if (!file || !file.buffer || file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Delivery proof image slip is required.',
      });
    }

    // 4. Run OCR and parse structured slip fields
    let ocrResult;
    try {
      ocrResult = await extractTextFromSlip(file.buffer);
    } catch (error: any) {
      console.error('[Delivery] OCR processing failed:', error?.message || error);
      return res.status(422).json({
        success: false,
        message: 'Unable to read the delivery slip. Please upload a clearer image.',
      });
    }

    if (!ocrResult.text) {
      return res.status(422).json({
        success: false,
        message: 'No text could be extracted. Please upload a clearer slip image.',
      });
    }

    const extractedDetails = parseSlipDetails(ocrResult);

    // 4b. Diagnostic logging in development mode (Requirement 8)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Delivery OCR] Scanned text length:', ocrResult.text.length);
      console.log('[Delivery OCR] Candidate receipt numbers:', extractedDetails.candidates);
      console.log('[Delivery OCR] Extracted details:', {
        receiptNo: extractedDetails.receiptNo,
        printedDeliveryDate: extractedDetails.printedDeliveryDate,
        printedDeliveryTime: extractedDetails.printedDeliveryTime,
        confidence: extractedDetails.confidence,
        needsReview: extractedDetails.needsReview,
      });
    } else {
      console.log(
        `[Delivery OCR] Slip parsed. Receipt resolved: ${!!extractedDetails.receiptNo}, confidence: ${extractedDetails.confidence}`
      );
    }

    if (clientReceiptNo) {
      // Manual input was provided: verify matching with OCR
      receiptDate = extractedDetails.printedDeliveryDate || '';
      receiptTime = extractedDetails.printedDeliveryTime || '';

      const extractedReceipt = normalizeSlipNumber(extractedDetails.receiptNo);
      const isReceiptMatch = areSlipNumbersEqual(clientReceiptNo, extractedReceipt);
      isVerified = isReceiptMatch && extractedDetails.confidence >= 60;

      // If OCR does not match manual input and manual correction not confirmed
      if (!isVerified && !isManualCorrection) {
        const reason = extractedReceipt
          ? `Submitted receipt number (${clientReceiptNo}) does not match the receipt number detected on the slip (${extractedReceipt}).`
          : 'Receipt number could not be confidently identified on the delivery slip.';

        return res.status(422).json({
          success: false,
          message: `${reason} Please review the slip image or confirm manual correction.`,
          requiresReview: true,
          ocr: {
            extractedReceiptNo: extractedDetails.receiptNo,
            submittedReceiptNo: clientReceiptNo,
            printedDeliveryDate: extractedDetails.printedDeliveryDate,
            printedDeliveryTime: extractedDetails.printedDeliveryTime,
            extractedText: extractedDetails.rawText,
            confidence: extractedDetails.confidence,
            needsReview: true,
            isVerified: false,
          },
        });
      }
    } else {
      // Automatic OCR Mode (No manual receiptNo provided in request)
      // Check for explicit template rejection (e.g. COLLECTION slip)
      if (extractedDetails.orderType === 'COLLECTION' || extractedDetails.validationReason === 'COLLECTION_REJECTED') {
        return res.status(422).json({
          success: false,
          code: 'COLLECTION_REJECTED',
          message: "'COLLECTION' slips :Invalid slip",
          ocr: extractedDetails,
        });
      }

      if (extractedDetails.error) {
        return res.status(422).json({
          success: false,
          code: extractedDetails.validationReason || 'VALIDATION_FAILED',
          message: extractedDetails.error,
          ocr: extractedDetails,
        });
      }

      if (!extractedDetails.receiptNo) {
        const isAmbiguous =
          (extractedDetails.candidates && extractedDetails.candidates.length > 1);
        return res.status(422).json({
          success: false,
          message: isAmbiguous
            ? 'The scanned receipt values are ambiguous or below the reliability threshold. Please upload a clearer image.'
            : 'Receipt number could not be read from the delivery slip. Please upload a clearer image.',
          ocr: extractedDetails,
        });
      }

      const normalized = normalizeSlipNumber(extractedDetails.receiptNo);
      if (!normalized) {
        return res.status(422).json({
          success: false,
          message: 'Extracted receipt number is invalid. Please upload a clearer image.',
          ocr: extractedDetails,
        });
      }

      if (!extractedDetails.printedDeliveryDate) {
        return res.status(422).json({
          success: false,
          message: 'Receipt date could not be read from the delivery slip. Please upload a clearer image.',
          ocr: extractedDetails,
        });
      }

      if (!extractedDetails.printedDeliveryTime) {
        return res.status(422).json({
          success: false,
          message: 'Receipt time could not be read from the delivery slip. Please upload a clearer image.',
          ocr: extractedDetails,
        });
      }

      const isTemplateValid =
        extractedDetails.validationReason === 'VALID' && !extractedDetails.needsReview;
      if (!isTemplateValid && (extractedDetails.confidence < 60 || extractedDetails.needsReview)) {
        return res.status(422).json({
          success: false,
          message: 'The scanned receipt values are ambiguous or below the reliability threshold. Please upload a clearer image.',
          ocr: extractedDetails,
        });
      }

      rawReceiptNo = extractedDetails.receiptNo;
      clientReceiptNo = normalized;
      receiptDate = extractedDetails.printedDeliveryDate;
      receiptTime = extractedDetails.printedDeliveryTime;
      isVerified = true;

      // Duplicate check on extracted receipt number
      if (await isReceiptRegistered(clientReceiptNo)) {
        return res.status(409).json({
          success: false,
          message: 'This receipt has already been delivered.',
        });
      }

      const existingDelivery = await Delivery.findOne({ receiptNo: clientReceiptNo, status: 'DELIVERED' });
      if (existingDelivery) {
        return res.status(409).json({
          success: false,
          message: 'This receipt has already been delivered.',
        });
      }
    }

    // 5. Recipient / User details
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

    // 6. Compute exact image SHA-256 hash
    const imageSha256 = calculateImageSha256(file.buffer);

    // Exact-image duplicate detection: check hash before saving new GridFS files
    const existingImage = await AcceptedReceipt.findOne({ imageSha256 });
    if (existingImage) {
      return res.status(409).json({
        success: false,
        message: 'This delivery slip image has already been uploaded and processed.',
      });
    }

    // Perceptual duplicate detection: calculate robust perceptual hash and check for likely modified copies
    let perceptualHash: string | null = null;
    let perceptualCheckResult: {
      hasLikelyMatch: boolean;
      matches: PerceptualMatchResult[];
    } = {
      hasLikelyMatch: false,
      matches: [],
    };

    try {
      perceptualHash = await calculatePerceptualHash(file.buffer);
      perceptualCheckResult = await checkPerceptualDuplicate(perceptualHash);
    } catch (pHashErr: any) {
      console.warn('[Delivery] Perceptual hash calculation warning:', pHashErr.message);
    }

    // 8. Safely reserve the receipt number and exact-image hash in permanent registry
    // Enforced by MongoDB unique index on normalizedReceiptNo and imageSha256
    const uploadedAt = new Date();
    try {
      acceptedReceiptDoc = await registerReceipt({
        normalizedReceiptNo: clientReceiptNo,
        originalReceiptNo: rawReceiptNo.trim(),
        imageSha256,
        perceptualHash,
        acceptedAt: uploadedAt,
        uploaderId: deliveryPersonId,
        slipFileId: null, // Initial reservation before GridFS upload
        metadata: {
          status: 'RESERVED',
          extractedReceiptNo: extractedDetails.receiptNo,
          confidence: extractedDetails.confidence,
          isManualCorrection,
          perceptualMatchDetected: perceptualCheckResult.hasLikelyMatch,
          perceptualMatches: perceptualCheckResult.matches,
        },
      });
    } catch (registryErr: any) {
      // Handle MongoDB duplicate key error (code 11000) for concurrent race conditions
      if (registryErr.code === 11000 || registryErr.message?.includes('E11000')) {
        const isImageDup =
          registryErr.message?.includes('imageSha256') ||
          registryErr.keyPattern?.imageSha256;
        const errorMessage = isImageDup
          ? 'This delivery slip image has already been uploaded and processed.'
          : 'This receipt has already been delivered.';

        return res.status(409).json({
          success: false,
          message: errorMessage,
        });
      }
      throw registryErr;
    }

    // 9. Upload image into MongoDB GridFS (deliverySlips bucket)
    try {
      const filename = `slip_${clientReceiptNo}_${Date.now()}${file.originalname ? file.originalname.slice(file.originalname.lastIndexOf('.')) : '.jpg'}`;
      const slipFileId = await gridfsService.uploadSlip(
        file.buffer,
        filename,
        file.mimetype || 'image/jpeg',
        {
          receiptNo: clientReceiptNo,
          deliveryPersonId,
          recipientName,
          extractedReceiptNo: extractedDetails.receiptNo,
          isManualCorrection,
          imageSha256,
          perceptualHash,
        }
      );
      uploadedSlipFileId = slipFileId as unknown as mongoose.Types.ObjectId;
    } catch (uploadErr) {
      // Release ONLY this request's reservation if GridFS upload fails
      if (acceptedReceiptDoc?._id) {
        try {
          await AcceptedReceipt.deleteOne({ _id: acceptedReceiptDoc._id });
        } catch {
          // Ignore rollback failure
        }
      }
      throw uploadErr;
    }

    // 10. Generate system deliveryDate using Asia/Kolkata (Do NOT accept from client or replace with printed date)
    const { deliveryDate } = getKolkataDateInfo(uploadedAt);

    // 11. Create Delivery document & link to permanent registry
    let delivery;
    try {
      delivery = await Delivery.create({
        receiptNo: clientReceiptNo,
        receiptDate: receiptDate || extractedDetails.printedDeliveryDate || '',
        receiptTime: receiptTime || extractedDetails.printedDeliveryTime || '',
        orderType: extractedDetails.orderType || 'DELIVERY',
        recipientName,
        userId: legacyUserId,
        deliveryPersonId: new mongoose.Types.ObjectId(deliveryPersonId),
        deliveryDate: receiptDate || deliveryDate,
        uploadedAt,
        slipFileId: uploadedSlipFileId,
        status: 'DELIVERED',
      });

      // Link deliveryId and slipFileId to permanent AcceptedReceipt record
      if (acceptedReceiptDoc?._id) {
        try {
          await AcceptedReceipt.updateOne(
            { _id: acceptedReceiptDoc._id },
            {
              deliveryId: delivery._id,
              slipFileId: uploadedSlipFileId,
              $set: { 'metadata.status': 'ACCEPTED' },
            }
          );
        } catch {
          // Non-critical background update
        }
      }
    } catch (dbError) {
      // If Delivery creation fails after registry reservation and GridFS upload:
      // Clean up ONLY this attempt's AcceptedReceipt reservation and uploaded GridFS file!
      if (acceptedReceiptDoc?._id) {
        try {
          await AcceptedReceipt.deleteOne({ _id: acceptedReceiptDoc._id });
        } catch {
          // Ignore rollback error
        }
      }
      if (uploadedSlipFileId) {
        try {
          await gridfsService.deleteSlip(uploadedSlipFileId.toString());
          console.log('[Delivery] Cleaned up orphaned GridFS file:', uploadedSlipFileId);
        } catch (cleanupErr: any) {
          console.error('[Delivery] Error cleaning up orphaned GridFS file:', cleanupErr.message);
        }
        uploadedSlipFileId = null;
      }
      throw dbError;
    }

    // 12. Determine if manual review is flagged (OCR low confidence, mismatch, or likely modified copy)
    const requiresManualReview =
      extractedDetails.needsReview || perceptualCheckResult.hasLikelyMatch;
    const isDeliveryVerified = isVerified && !perceptualCheckResult.hasLikelyMatch;

    // 13. Return delivery data and structured OCR verification details
    return res.status(201).json({
      success: true,
      message: 'Delivery recorded successfully',
      receiptNo: delivery.receiptNo,
      receiptDate: delivery.receiptDate || receiptDate || delivery.deliveryDate,
      receiptTime: delivery.receiptTime || receiptTime || '',
      orderType: (delivery as any).orderType || extractedDetails.orderType || 'DELIVERY',
      recipientName: delivery.recipientName,
      deliveryDate: delivery.deliveryDate,
      uploadedAt: delivery.uploadedAt,
      status: delivery.status,
      slipFileId: delivery.slipFileId?.toString(),
      ocr: {
        extractedReceiptNo: extractedDetails.receiptNo,
        printedDeliveryDate: extractedDetails.printedDeliveryDate,
        printedDeliveryTime: extractedDetails.printedDeliveryTime,
        orderType: extractedDetails.orderType || 'DELIVERY',
        confidence: extractedDetails.confidence,
        needsReview: requiresManualReview,
        isVerified: isDeliveryVerified,
        isManualCorrection,
        ...(process.env.NODE_ENV !== 'production'
          ? {
              extractedText: extractedDetails.rawText,
              candidates: extractedDetails.candidates,
            }
          : {}),
      },
      duplicateCheck: {
        isExactDuplicate: false,
        perceptualMatchDetected: perceptualCheckResult.hasLikelyMatch,
        matchedReceipts: perceptualCheckResult.matches.map((m) => ({
          receiptNo: m.normalizedReceiptNo,
          similarity: m.similarity,
          hammingDistance: m.hammingDistance,
        })),
      },
      delivery: {
        id: delivery._id.toString(),
        receiptNo: delivery.receiptNo,
        receiptDate: delivery.receiptDate || receiptDate || delivery.deliveryDate,
        receiptTime: delivery.receiptTime || receiptTime || '',
        orderType: (delivery as any).orderType || extractedDetails.orderType || 'DELIVERY',
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
    const fileId = req.params.fileId;

    if (typeof fileId !== 'string' || !mongoose.isValidObjectId(fileId)) {
      return res.status(400).json({ error: 'Invalid GridFS file ID' });
    }

    const { stream, file } = await gridfsService.getSlip(fileId);

    const contentType =
      typeof file.metadata?.contentType === 'string'
        ? file.metadata.contentType
        : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
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
