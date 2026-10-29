import { describe, expect, it, vi, beforeEach } from 'vitest';
import sharp from 'sharp';
import {
  calculatePerceptualHash,
  calculateHammingDistance,
  calculateSimilarity,
  isLikelyModifiedCopy,
  findSimilarReceipts,
  checkPerceptualDuplicate,
} from './perceptual-hash.service';
import { AcceptedReceipt } from '../models/AcceptedReceipt';
import { InMemoryDatabase } from '../config/database';

vi.mock('../models/AcceptedReceipt');

describe('Perceptual Hash Service (Phase 5: Modified Copy Detection)', () => {
  let sampleImageBuffer: Buffer;

  beforeEach(async () => {
    vi.clearAllMocks();
    InMemoryDatabase.isUsingFallback = false;

    // Create a deterministic synthetic test image buffer
    sampleImageBuffer = await sharp({
      create: {
        width: 200,
        height: 150,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .composite([
        {
          input: Buffer.from(
            '<svg><text x="20" y="40" font-size="20">SLIP 12345</text><rect x="10" y="50" width="150" height="60" fill="black"/></svg>'
          ),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();
  });

  describe('calculatePerceptualHash', () => {
    it('computes a 32-character hexadecimal perceptual hash (128 bits)', async () => {
      const hash = await calculatePerceptualHash(sampleImageBuffer);

      expect(hash).toHaveLength(32);
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });

    it('computes identical hashes for the same image buffer', async () => {
      const hash1 = await calculatePerceptualHash(sampleImageBuffer);
      const hash2 = await calculatePerceptualHash(sampleImageBuffer);

      expect(hash1).toBe(hash2);
    });

    it('identifies recompressed copies with very low Hamming distance', async () => {
      const recompressed = await sharp(sampleImageBuffer).jpeg({ quality: 40 }).toBuffer();
      const baseHash = await calculatePerceptualHash(sampleImageBuffer);
      const recompressedHash = await calculatePerceptualHash(recompressed);

      const distance = calculateHammingDistance(baseHash, recompressedHash);
      expect(distance).toBeLessThanOrEqual(6);
      expect(isLikelyModifiedCopy(baseHash, recompressedHash)).toBe(true);
    });

    it('identifies resized / downscaled copies with low Hamming distance', async () => {
      const resized = await sharp(sampleImageBuffer).resize(100, 75).png().toBuffer();
      const baseHash = await calculatePerceptualHash(sampleImageBuffer);
      const resizedHash = await calculatePerceptualHash(resized);

      const distance = calculateHammingDistance(baseHash, resizedHash);
      expect(distance).toBeLessThanOrEqual(12);
      expect(isLikelyModifiedCopy(baseHash, resizedHash)).toBe(true);
    });

    it('identifies brightness / contrast adjusted copies with very low Hamming distance', async () => {
      const brightened = await sharp(sampleImageBuffer)
        .modulate({ brightness: 1.25, saturation: 0.8 })
        .png()
        .toBuffer();
      const baseHash = await calculatePerceptualHash(sampleImageBuffer);
      const brightenedHash = await calculatePerceptualHash(brightened);

      const distance = calculateHammingDistance(baseHash, brightenedHash);
      expect(distance).toBeLessThanOrEqual(5);
      expect(isLikelyModifiedCopy(baseHash, brightenedHash)).toBe(true);
    });

    it('identifies slightly cropped copies with low Hamming distance', async () => {
      const cropped = await sharp(sampleImageBuffer)
        .extract({ left: 10, top: 10, width: 180, height: 130 })
        .png()
        .toBuffer();
      const baseHash = await calculatePerceptualHash(sampleImageBuffer);
      const croppedHash = await calculatePerceptualHash(cropped);

      const distance = calculateHammingDistance(baseHash, croppedHash);
      expect(distance).toBeLessThanOrEqual(16);
      expect(isLikelyModifiedCopy(baseHash, croppedHash)).toBe(true);
    });

    it('produces high Hamming distance for a completely different image', async () => {
      const differentImage = await sharp({
        create: {
          width: 200,
          height: 150,
          channels: 3,
          background: { r: 10, g: 240, b: 30 },
        },
      })
        .composite([
          {
            input: Buffer.from('<svg><circle cx="100" cy="75" r="50" fill="red"/></svg>'),
            top: 0,
            left: 0,
          },
        ])
        .png()
        .toBuffer();

      const baseHash = await calculatePerceptualHash(sampleImageBuffer);
      const differentHash = await calculatePerceptualHash(differentImage);

      const distance = calculateHammingDistance(baseHash, differentHash);
      expect(distance).toBeGreaterThan(20);
      expect(isLikelyModifiedCopy(baseHash, differentHash)).toBe(false);
    });

    it('throws error for invalid, empty, or non-buffer input', async () => {
      // @ts-expect-error Testing invalid runtime inputs
      await expect(calculatePerceptualHash(null)).rejects.toThrow(
        'A valid, non-empty image buffer is required'
      );
      // @ts-expect-error Testing invalid runtime inputs
      await expect(calculatePerceptualHash(undefined)).rejects.toThrow(
        'A valid, non-empty image buffer is required'
      );
      await expect(calculatePerceptualHash(Buffer.alloc(0))).rejects.toThrow(
        'A valid, non-empty image buffer is required'
      );
    });

    it('throws informative error for corrupt non-image bytes', async () => {
      await expect(calculatePerceptualHash(Buffer.from('not-an-image-data'))).rejects.toThrow(
        'Failed to compute perceptual hash'
      );
    });
  });

  describe('calculateHammingDistance & calculateSimilarity', () => {
    it('calculates 0 distance and 1.0 similarity for identical hashes', () => {
      const hash = 'a'.repeat(32);
      expect(calculateHammingDistance(hash, hash)).toBe(0);
      expect(calculateSimilarity(hash, hash)).toBe(1.0);
    });

    it('calculates bit differences accurately', () => {
      // '0' is 0000, '1' is 0001 -> 1 bit difference
      const h1 = '0' + '0'.repeat(31);
      const h2 = '1' + '0'.repeat(31);
      expect(calculateHammingDistance(h1, h2)).toBe(1);
      expect(calculateSimilarity(h1, h2)).toBe((128 - 1) / 128);

      // '0' is 0000, 'f' is 1111 -> 4 bit difference
      const h3 = 'f' + '0'.repeat(31);
      expect(calculateHammingDistance(h1, h3)).toBe(4);
    });

    it('throws error when hashes have unequal length or invalid format', () => {
      expect(() => calculateHammingDistance('abc', 'abcd')).toThrow('unequal length');
      // @ts-expect-error Testing invalid input
      expect(() => calculateHammingDistance(null, 'abc')).toThrow('valid non-empty strings');
    });
  });

  describe('isLikelyModifiedCopy', () => {
    it('returns true when distance is below default threshold', () => {
      const h1 = '0'.repeat(32);
      const h2 = '1'.repeat(10) + '0'.repeat(22); // 10 bits difference
      expect(isLikelyModifiedCopy(h1, h2)).toBe(true);
    });

    it('returns false when distance exceeds default threshold', () => {
      const h1 = '0'.repeat(32);
      const h2 = 'f'.repeat(10) + '0'.repeat(22); // 40 bits difference
      expect(isLikelyModifiedCopy(h1, h2)).toBe(false);
    });

    it('respects custom override maxDistance option', () => {
      const h1 = '0'.repeat(32);
      const h2 = '1'.repeat(5) + '0'.repeat(27); // 5 bits difference

      expect(isLikelyModifiedCopy(h1, h2, { maxDistance: 4 })).toBe(false);
      expect(isLikelyModifiedCopy(h1, h2, { maxDistance: 5 })).toBe(true);
    });
  });

  describe('findSimilarReceipts', () => {
    it('finds and sorts matching accepted receipts within threshold', async () => {
      const targetHash = '0'.repeat(32);
      const closeHash = '1'.repeat(3) + '0'.repeat(29); // 3 bits diff
      const moderateHash = '1'.repeat(8) + '0'.repeat(24); // 8 bits diff
      const farHash = 'f'.repeat(15) + '0'.repeat(17); // 60 bits diff

      const mockDocs = [
        {
          _id: 'rec-1',
          normalizedReceiptNo: 'REC-1001',
          originalReceiptNo: 'REC-1001',
          perceptualHash: closeHash,
          imageSha256: 'sha-1',
        },
        {
          _id: 'rec-2',
          normalizedReceiptNo: 'REC-1002',
          originalReceiptNo: 'REC-1002',
          perceptualHash: farHash,
          imageSha256: 'sha-2',
        },
        {
          _id: 'rec-3',
          normalizedReceiptNo: 'REC-1003',
          originalReceiptNo: 'REC-1003',
          perceptualHash: moderateHash,
          imageSha256: 'sha-3',
        },
      ];

      vi.mocked(AcceptedReceipt.find).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockDocs),
        }),
      } as any);

      const matches = await findSimilarReceipts(targetHash, { maxDistance: 10 });

      expect(matches).toHaveLength(2);
      // Closest match first
      expect(matches[0].normalizedReceiptNo).toBe('REC-1001');
      expect(matches[0].hammingDistance).toBe(3);
      expect(matches[1].normalizedReceiptNo).toBe('REC-1003');
      expect(matches[1].hammingDistance).toBe(8);
    });

    it('handles InMemoryDatabase fallback', async () => {
      InMemoryDatabase.isUsingFallback = true;
      const targetHash = '0'.repeat(32);
      const matchHash = '1'.repeat(2) + '0'.repeat(30);

      InMemoryDatabase.deliveries = [
        {
          _id: 'inmem-1',
          receiptNo: 'REC-5001',
          perceptualHash: matchHash,
          imageSha256: 'sha-5001',
        } as any,
      ];

      const matches = await findSimilarReceipts(targetHash);

      expect(matches).toHaveLength(1);
      expect(matches[0].normalizedReceiptNo).toBe('REC-5001');
      expect(matches[0].hammingDistance).toBe(2);
      expect(AcceptedReceipt.find).not.toHaveBeenCalled();
    });
  });

  describe('checkPerceptualDuplicate', () => {
    it('returns match metadata when likely perceptual copy is found', async () => {
      const baseHash = await calculatePerceptualHash(sampleImageBuffer);
      const recompressed = await sharp(sampleImageBuffer).jpeg({ quality: 50 }).toBuffer();

      vi.mocked(AcceptedReceipt.find).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: 'rec-prev',
              normalizedReceiptNo: 'REC-PREV-01',
              originalReceiptNo: 'REC-PREV-01',
              perceptualHash: baseHash,
              imageSha256: 'prev-sha256',
            },
          ]),
        }),
      } as any);

      const result = await checkPerceptualDuplicate(recompressed);

      expect(result.hasLikelyMatch).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.bestMatch?.normalizedReceiptNo).toBe('REC-PREV-01');
      expect(result.bestMatch?.similarity).toBeGreaterThan(0.85);
    });
  });
});
