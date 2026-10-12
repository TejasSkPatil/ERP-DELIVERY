import { describe, expect, it, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import {
  calculateImageSha256,
  isImageDuplicate,
  findReceiptByImageHash,
} from './image-hash.service';
import { AcceptedReceipt } from '../models/AcceptedReceipt';
import { InMemoryDatabase } from '../config/database';

vi.mock('../models/AcceptedReceipt');

describe('image-hash service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    InMemoryDatabase.isUsingFallback = false;
  });

  describe('calculateImageSha256', () => {
    it('calculates deterministic 64-character lowercase hexadecimal SHA-256 digest', () => {
      const buffer = Buffer.from('delivery-proof-test-image-data');
      const expectedHash = crypto.createHash('sha256').update(buffer).digest('hex');

      const hash1 = calculateImageSha256(buffer);
      const hash2 = calculateImageSha256(buffer);

      expect(hash1).toBe(expectedHash);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces distinct hashes for different image buffers', () => {
      const bufferA = Buffer.from('image-A-bytes');
      const bufferB = Buffer.from('image-B-bytes');

      const hashA = calculateImageSha256(bufferA);
      const hashB = calculateImageSha256(bufferB);

      expect(hashA).not.toBe(hashB);
    });

    it('matches known test vectors accurately', () => {
      const knownBuffer = Buffer.from('hello world');
      const knownSha256 = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';

      expect(calculateImageSha256(knownBuffer)).toBe(knownSha256);
    });

    it('throws error for null, undefined, empty, or non-buffer inputs', () => {
      // @ts-expect-error Testing invalid runtime inputs
      expect(() => calculateImageSha256(null)).toThrow(
        'A valid, non-empty image buffer is required to calculate SHA-256 hash.'
      );
      // @ts-expect-error Testing invalid runtime inputs
      expect(() => calculateImageSha256(undefined)).toThrow(
        'A valid, non-empty image buffer is required to calculate SHA-256 hash.'
      );
      expect(() => calculateImageSha256(Buffer.alloc(0))).toThrow(
        'A valid, non-empty image buffer is required to calculate SHA-256 hash.'
      );
      // @ts-expect-error Testing invalid runtime inputs
      expect(() => calculateImageSha256('string-instead-of-buffer')).toThrow(
        'A valid, non-empty image buffer is required to calculate SHA-256 hash.'
      );
    });
  });

  describe('isImageDuplicate', () => {
    it('returns true when exact image hash is found in AcceptedReceipt registry', async () => {
      const testHash = 'a'.repeat(64);
      vi.mocked(AcceptedReceipt.findOne).mockResolvedValueOnce({
        _id: 'receipt-123',
        imageSha256: testHash,
        normalizedReceiptNo: 'REC-1001',
      } as any);

      const isDup = await isImageDuplicate(testHash);

      expect(isDup).toBe(true);
      expect(AcceptedReceipt.findOne).toHaveBeenCalledWith({ imageSha256: testHash });
    });

    it('returns false when exact image hash does not exist in AcceptedReceipt', async () => {
      const testHash = 'b'.repeat(64);
      vi.mocked(AcceptedReceipt.findOne).mockResolvedValueOnce(null);

      const isDup = await isImageDuplicate(testHash);

      expect(isDup).toBe(false);
      expect(AcceptedReceipt.findOne).toHaveBeenCalledWith({ imageSha256: testHash });
    });

    it('returns false for empty or non-string image hash', async () => {
      // @ts-expect-error Testing invalid input
      expect(await isImageDuplicate(null)).toBe(false);
      expect(await isImageDuplicate('')).toBe(false);
      expect(AcceptedReceipt.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findReceiptByImageHash', () => {
    it('returns the found AcceptedReceipt document when matching record exists', async () => {
      const testHash = 'c'.repeat(64);
      const mockDoc = {
        _id: 'receipt-456',
        imageSha256: testHash,
        normalizedReceiptNo: 'REC-2002',
      };
      vi.mocked(AcceptedReceipt.findOne).mockResolvedValueOnce(mockDoc as any);

      const result = await findReceiptByImageHash(testHash);

      expect(result).toEqual(mockDoc);
      expect(AcceptedReceipt.findOne).toHaveBeenCalledWith({ imageSha256: testHash });
    });

    it('returns null when no matching record is found', async () => {
      const testHash = 'd'.repeat(64);
      vi.mocked(AcceptedReceipt.findOne).mockResolvedValueOnce(null);

      const result = await findReceiptByImageHash(testHash);

      expect(result).toBeNull();
    });

    it('queries InMemoryDatabase fallback when MongoDB fallback is active', async () => {
      InMemoryDatabase.isUsingFallback = true;
      const testHash = 'e'.repeat(64);
      InMemoryDatabase.deliveries = [
        {
          _id: 'in-mem-1',
          receiptNo: 'REC-3003',
          imageSha256: testHash,
        } as any,
      ];

      const result = await findReceiptByImageHash(testHash);

      expect(result).toBeDefined();
      expect((result as any).imageSha256).toBe(testHash);
      expect(AcceptedReceipt.findOne).not.toHaveBeenCalled();
    });
  });
});
