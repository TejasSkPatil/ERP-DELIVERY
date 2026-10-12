import { describe, expect, it, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  computeImageSha256,
  isReceiptRegistered,
  registerReceipt,
  backfillHistoricalReceipts,
} from './receiptRegistry.service';
import { AcceptedReceipt } from '../models/AcceptedReceipt';
import { Delivery } from '../models/Delivery';

vi.mock('../models/AcceptedReceipt');
vi.mock('../models/Delivery');

describe('receiptRegistry service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computeImageSha256', () => {
    it('computes consistent deterministic SHA-256 hash for image buffers', () => {
      const buffer = Buffer.from('test-image-content-data');
      const hash1 = computeImageSha256(buffer);
      const hash2 = computeImageSha256(buffer);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // Hex SHA-256
    });

    it('rejects invalid or null buffer inputs', () => {
      // @ts-expect-error Testing invalid runtime input
      expect(() => computeImageSha256(null)).toThrow(
        'Valid image buffer is required to compute SHA-256 hash.'
      );
    });
  });

  describe('isReceiptRegistered', () => {
    it('returns true when receipt is registered in AcceptedReceipt', async () => {
      vi.mocked(AcceptedReceipt.findOne).mockResolvedValueOnce({
        normalizedReceiptNo: 'REC-1001',
      } as any);

      const exists = await isReceiptRegistered('#rec-1001');
      expect(exists).toBe(true);
      expect(AcceptedReceipt.findOne).toHaveBeenCalledWith({
        normalizedReceiptNo: 'REC-1001',
      });
    });

    it('returns false when receipt is not registered', async () => {
      vi.mocked(AcceptedReceipt.findOne).mockResolvedValueOnce(null);

      const exists = await isReceiptRegistered('REC-9999');
      expect(exists).toBe(false);
    });

    it('returns false for invalid receipt numbers', async () => {
      const exists = await isReceiptRegistered('');
      expect(exists).toBe(false);
      expect(AcceptedReceipt.findOne).not.toHaveBeenCalled();
    });
  });

  describe('registerReceipt', () => {
    it('creates an AcceptedReceipt document with normalized uppercase key', async () => {
      const mockDoc = {
        _id: new mongoose.Types.ObjectId(),
        normalizedReceiptNo: 'REC-2026-01',
        originalReceiptNo: '#rec-2026-01',
        imageSha256: 'a1b2c3d4e5f6',
      };
      vi.mocked(AcceptedReceipt.create).mockResolvedValueOnce(mockDoc as any);

      const result = await registerReceipt({
        normalizedReceiptNo: '#rec-2026-01',
        originalReceiptNo: '#rec-2026-01',
        imageSha256: 'a1b2c3d4e5f6',
      });

      expect(AcceptedReceipt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          normalizedReceiptNo: 'REC-2026-01',
          originalReceiptNo: '#rec-2026-01',
          imageSha256: 'a1b2c3d4e5f6',
        })
      );
      expect(result).toBe(mockDoc);
    });
  });

  describe('backfillHistoricalReceipts', () => {
    it('backfills historical deliveries into AcceptedReceipt and reports conflicts', async () => {
      const id1 = new mongoose.Types.ObjectId();
      const id2 = new mongoose.Types.ObjectId();
      const mockDeliveries = [
        {
          _id: id1,
          receiptNo: 'REC-1001',
          uploadedAt: new Date(),
        },
        {
          _id: id2,
          receiptNo: 'REC-1001', // Duplicate conflicting receipt!
          uploadedAt: new Date(),
        },
      ];

      vi.mocked(AcceptedReceipt.init).mockResolvedValueOnce({} as any);
      vi.mocked(Delivery.find).mockReturnValueOnce({
        sort: vi.fn().mockResolvedValueOnce(mockDeliveries),
      } as any);

      // First delivery: not yet in registry
      vi.mocked(AcceptedReceipt.findOne).mockResolvedValueOnce(null);
      vi.mocked(AcceptedReceipt.create).mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        normalizedReceiptNo: 'REC-1001',
        deliveryId: id1,
      } as any);

      // Second delivery: already registered with different deliveryId -> conflict!
      vi.mocked(AcceptedReceipt.findOne).mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        normalizedReceiptNo: 'REC-1001',
        originalReceiptNo: 'REC-1001',
        deliveryId: id1,
      } as any);

      const result = await backfillHistoricalReceipts();

      expect(result.migratedCount).toBe(1);
      expect(result.conflictCount).toBe(1);
      expect(result.conflicts[0].normalizedReceiptNo).toBe('REC-1001');
      expect(result.conflicts[0].conflictingDeliveryId).toBe(id2.toString());
    });
  });
});
