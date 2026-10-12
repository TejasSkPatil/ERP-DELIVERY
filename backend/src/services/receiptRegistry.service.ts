import crypto from 'crypto';
import mongoose from 'mongoose';
import { AcceptedReceipt, IAcceptedReceiptDocument } from '../models/AcceptedReceipt';
import { Delivery } from '../models/Delivery';
import { normalizeSlipNumber } from '../utils/normalize-slip-number';
import { InMemoryDatabase } from '../config/database';

export interface RegisterReceiptInput {
  normalizedReceiptNo: string;
  originalReceiptNo: string;
  deliveryId?: mongoose.Types.ObjectId | string | null;
  acceptedAt?: Date;
  imageSha256: string;
  perceptualHash?: string | null;
  uploaderId?: mongoose.Types.ObjectId | string | null;
  slipFileId?: mongoose.Types.ObjectId | string | null;
  metadata?: Record<string, any>;
}

export interface HistoricalConflictRecord {
  normalizedReceiptNo: string;
  existingReceiptId: string;
  conflictingDeliveryId: string;
  existingOriginalReceiptNo: string;
  conflictingOriginalReceiptNo: string;
  detectedAt: Date;
}

/**
 * Computes exact cryptographic SHA-256 hash of an image buffer.
 */
export function computeImageSha256(buffer: Buffer): string {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Valid image buffer is required to compute SHA-256 hash.');
  }
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Checks whether a normalized receipt number is already registered in the permanent registry.
 */
export async function isReceiptRegistered(normalizedReceiptNo: string): Promise<boolean> {
  const normalized = normalizeSlipNumber(normalizedReceiptNo);
  if (!normalized) {
    return false;
  }

  if (InMemoryDatabase.isUsingFallback) {
    return (InMemoryDatabase.deliveries || []).some(
      (d) => normalizeSlipNumber(d.receiptNo) === normalized
    );
  }

  const existing = await AcceptedReceipt.findOne({ normalizedReceiptNo: normalized });
  return !!existing;
}

/**
 * Atomically reserves/registers a receipt number in the permanent AcceptedReceipt registry.
 * Relies on MongoDB unique index on normalizedReceiptNo to prevent race conditions.
 */
export async function registerReceipt(
  input: RegisterReceiptInput
): Promise<IAcceptedReceiptDocument> {
  const normalized = normalizeSlipNumber(input.normalizedReceiptNo);
  if (!normalized) {
    throw new Error('Invalid normalized receipt number provided for registration.');
  }

  const doc = await AcceptedReceipt.create({
    normalizedReceiptNo: normalized,
    originalReceiptNo: input.originalReceiptNo.trim(),
    deliveryId: input.deliveryId ? new mongoose.Types.ObjectId(input.deliveryId.toString()) : null,
    acceptedAt: input.acceptedAt || new Date(),
    imageSha256: input.imageSha256,
    perceptualHash: input.perceptualHash || null,
    uploaderId: input.uploaderId ? new mongoose.Types.ObjectId(input.uploaderId.toString()) : null,
    slipFileId: input.slipFileId ? new mongoose.Types.ObjectId(input.slipFileId.toString()) : null,
    metadata: input.metadata || {},
  });

  return doc;
}

/**
 * Migrates and backfills existing historical Delivery records into AcceptedReceipt registry.
 * Detects conflicting duplicate historical entries and logs them for manual review rather than discarding them.
 */
export async function backfillHistoricalReceipts(): Promise<{
  migratedCount: number;
  conflictCount: number;
  conflicts: HistoricalConflictRecord[];
}> {
  if (InMemoryDatabase.isUsingFallback) {
    return { migratedCount: 0, conflictCount: 0, conflicts: [] };
  }

  try {
    // Ensure unique index is built in MongoDB
    await AcceptedReceipt.init();
  } catch (err: any) {
    console.warn('[ReceiptRegistry] Index initialization warning:', err.message);
  }

  const conflicts: HistoricalConflictRecord[] = [];
  let migratedCount = 0;

  try {
    const historicalDeliveries = await Delivery.find().sort({ uploadedAt: 1, createdAt: 1 });

    for (const delivery of historicalDeliveries) {
      const normalized = normalizeSlipNumber(delivery.receiptNo);
      if (!normalized) {
        continue;
      }

      const existing = await AcceptedReceipt.findOne({ normalizedReceiptNo: normalized });

      if (existing) {
        // Conflicting historical value detected!
        if (existing.deliveryId?.toString() !== delivery._id.toString()) {
          const conflict: HistoricalConflictRecord = {
            normalizedReceiptNo: normalized,
            existingReceiptId: existing._id.toString(),
            conflictingDeliveryId: delivery._id.toString(),
            existingOriginalReceiptNo: existing.originalReceiptNo,
            conflictingOriginalReceiptNo: delivery.receiptNo,
            detectedAt: new Date(),
          };
          conflicts.push(conflict);
          console.warn(
            `[ReceiptRegistry] Historical duplicate conflict detected! Normalized: "${normalized}" | Existing Delivery: ${existing.deliveryId} vs Conflicting Delivery: ${delivery._id}`
          );
        }
        continue;
      }

      // Compute or generate SHA-256 for historical record
      const fallbackHash = crypto
        .createHash('sha256')
        .update(delivery._id.toString() + delivery.receiptNo)
        .digest('hex');

      try {
        await AcceptedReceipt.create({
          normalizedReceiptNo: normalized,
          originalReceiptNo: delivery.receiptNo,
          deliveryId: delivery._id,
          acceptedAt: delivery.uploadedAt || delivery.createdAt || new Date(),
          imageSha256: fallbackHash,
          uploaderId: delivery.deliveryPersonId || null,
          slipFileId: delivery.slipFileId || null,
          metadata: { isHistoricalBackfill: true },
        });
        migratedCount++;
      } catch (insertErr: any) {
        // Handle concurrent duplicate insertion during backfill
        if (insertErr.code === 11000 || insertErr.message?.includes('E11000')) {
          console.warn(`[ReceiptRegistry] Duplicate key skipped during backfill: ${normalized}`);
        } else {
          console.error(`[ReceiptRegistry] Error inserting historical receipt ${normalized}:`, insertErr.message);
        }
      }
    }

    if (migratedCount > 0 || conflicts.length > 0) {
      console.log(
        `[ReceiptRegistry] Backfill completed. Migrated: ${migratedCount} | Conflicts detected: ${conflicts.length}`
      );
    }
  } catch (error: any) {
    console.error('[ReceiptRegistry] Historical migration failed:', error.message);
  }

  return {
    migratedCount,
    conflictCount: conflicts.length,
    conflicts,
  };
}

export default {
  computeImageSha256,
  isReceiptRegistered,
  registerReceipt,
  backfillHistoricalReceipts,
};
