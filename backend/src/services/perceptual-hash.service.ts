import sharp from 'sharp';
import { AcceptedReceipt, IAcceptedReceiptDocument } from '../models/AcceptedReceipt';
import { InMemoryDatabase } from '../config/database';

/**
 * Standard perceptual hash length in bits (64-bit aHash + 64-bit dHash = 128 bits).
 * Represented as a 32-character lowercase hexadecimal string.
 */
export const HASH_TOTAL_BITS = 128;

/**
 * Default maximum Hamming distance threshold for flagging likely modified copies.
 * (18 bits out of 128 bits corresponds to ~86% visual similarity).
 * Can be overridden via PERCEPTUAL_HASH_HAMMING_THRESHOLD environment variable.
 */
export const DEFAULT_HAMMING_THRESHOLD = 18;

export interface PerceptualMatchResult {
  receiptId: string;
  normalizedReceiptNo: string;
  originalReceiptNo: string;
  perceptualHash: string;
  imageSha256: string;
  hammingDistance: number;
  similarity: number;
  deliveryId?: string | null;
}

export interface CheckPerceptualOptions {
  maxDistance?: number;
  limit?: number;
}

/**
 * Computes a robust 128-bit perceptual hash (32-character hex) of an image buffer.
 * Combines 64-bit Average Hash (aHash) with 64-bit Difference Hash (dHash) via Sharp:
 * - Invariant to resizing and downsampling
 * - Invariant to JPEG recompression and compression artifacts
 * - Invariant to brightness and contrast adjustments
 * - Resilient against small crops and minor edits
 *
 * @param buffer Raw image buffer
 * @returns 32-character lowercase hexadecimal perceptual hash
 */
export async function calculatePerceptualHash(buffer: Buffer): Promise<string> {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('A valid, non-empty image buffer is required to calculate perceptual hash.');
  }

  try {
    // 1. Calculate 64-bit aHash (Average Hash): 8x8 grayscale grid compared against mean intensity
    const { data: d8 } = await sharp(buffer)
      .grayscale()
      .resize(8, 8, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let sum = 0;
    for (let i = 0; i < 64; i++) {
      sum += d8[i];
    }
    const avg = sum / 64;

    let aHashHex = '';
    for (let r = 0; r < 8; r++) {
      let byteVal = 0;
      for (let c = 0; c < 8; c++) {
        const bit = d8[r * 8 + c] >= avg ? 1 : 0;
        byteVal = (byteVal << 1) | bit;
      }
      aHashHex += byteVal.toString(16).padStart(2, '0');
    }

    // 2. Calculate 64-bit dHash (Difference Hash): 9x8 grayscale grid tracking horizontal gradients
    const { data: d9 } = await sharp(buffer)
      .grayscale()
      .resize(9, 8, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let dHashHex = '';
    for (let r = 0; r < 8; r++) {
      let byteVal = 0;
      for (let c = 0; c < 8; c++) {
        const bit = d9[r * 9 + c] >= d9[r * 9 + c + 1] ? 1 : 0;
        byteVal = (byteVal << 1) | bit;
      }
      dHashHex += byteVal.toString(16).padStart(2, '0');
    }

    return (aHashHex + dHashHex).toLowerCase();
  } catch (err: any) {
    if (err.message?.includes('A valid, non-empty image buffer')) {
      throw err;
    }
    throw new Error(`Failed to compute perceptual hash: ${err.message || 'unsupported image format'}`);
  }
}

/**
 * Calculates the bitwise Hamming distance between two hexadecimal hashes.
 *
 * @param hash1 First hex string
 * @param hash2 Second hex string
 * @returns Number of differing bits (0 to total bits)
 */
export function calculateHammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || typeof hash1 !== 'string' || typeof hash2 !== 'string') {
    throw new Error('Both hashes must be valid non-empty strings.');
  }

  if (hash1.length !== hash2.length) {
    throw new Error(`Cannot compare hashes of unequal length (${hash1.length} vs ${hash2.length}).`);
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    let xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }

  return distance;
}

/**
 * Computes the normalized visual similarity score between two perceptual hashes.
 *
 * @param hash1 First hex string
 * @param hash2 Second hex string
 * @returns Similarity score between 0.0 (completely dissimilar) and 1.0 (identical)
 */
export function calculateSimilarity(hash1: string, hash2: string): number {
  const distance = calculateHammingDistance(hash1, hash2);
  const totalBits = hash1.length * 4;
  return Math.max(0, 1 - distance / totalBits);
}

/**
 * Resolves the configured Hamming distance threshold.
 */
export function getConfiguredThreshold(overrideDistance?: number): number {
  if (typeof overrideDistance === 'number' && overrideDistance >= 0) {
    return overrideDistance;
  }

  const envVal = process.env.PERCEPTUAL_HASH_HAMMING_THRESHOLD;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return DEFAULT_HAMMING_THRESHOLD;
}

/**
 * Determines whether two perceptual hashes represent likely modified copies.
 *
 * @param hash1 First hex hash
 * @param hash2 Second hex hash
 * @param options Configurable threshold options
 */
export function isLikelyModifiedCopy(
  hash1: string,
  hash2: string,
  options?: { maxDistance?: number }
): boolean {
  try {
    const distance = calculateHammingDistance(hash1, hash2);
    const threshold = getConfiguredThreshold(options?.maxDistance);
    return distance <= threshold;
  } catch {
    return false;
  }
}

/**
 * Queries AcceptedReceipt records and finds previous slips that have a perceptual hash
 * within the configured Hamming distance threshold.
 *
 * @param perceptualHash 32-character hexadecimal perceptual hash
 * @param options Options including maxDistance and limit
 */
export async function findSimilarReceipts(
  perceptualHash: string,
  options?: CheckPerceptualOptions
): Promise<PerceptualMatchResult[]> {
  if (!perceptualHash || typeof perceptualHash !== 'string') {
    return [];
  }

  const maxDistance = getConfiguredThreshold(options?.maxDistance);
  const limit = options?.limit || 5;

  let candidates: Array<{
    _id: any;
    normalizedReceiptNo: string;
    originalReceiptNo: string;
    perceptualHash?: string | null;
    imageSha256: string;
    deliveryId?: any;
  }> = [];

  if (InMemoryDatabase.isUsingFallback) {
    candidates = (InMemoryDatabase.deliveries || [])
      .filter((d: any) => d.perceptualHash)
      .map((d: any) => ({
        _id: d._id || d.id,
        normalizedReceiptNo: d.receiptNo,
        originalReceiptNo: d.receiptNo,
        perceptualHash: d.perceptualHash,
        imageSha256: d.imageSha256,
        deliveryId: d._id || d.id,
      }));
  } else {
    candidates = await AcceptedReceipt.find({
      perceptualHash: { $exists: true, $ne: null },
    })
      .select('normalizedReceiptNo originalReceiptNo perceptualHash imageSha256 deliveryId')
      .lean();
  }

  const matches: PerceptualMatchResult[] = [];

  for (const candidate of candidates) {
    if (!candidate.perceptualHash || candidate.perceptualHash.length !== perceptualHash.length) {
      continue;
    }

    const distance = calculateHammingDistance(perceptualHash, candidate.perceptualHash);
    if (distance <= maxDistance) {
      const similarity = calculateSimilarity(perceptualHash, candidate.perceptualHash);
      matches.push({
        receiptId: candidate._id?.toString() || '',
        normalizedReceiptNo: candidate.normalizedReceiptNo,
        originalReceiptNo: candidate.originalReceiptNo,
        perceptualHash: candidate.perceptualHash,
        imageSha256: candidate.imageSha256,
        hammingDistance: distance,
        similarity: Math.round(similarity * 1000) / 1000,
        deliveryId: candidate.deliveryId?.toString() || null,
      });
    }
  }

  // Sort by lowest Hamming distance (highest similarity first)
  matches.sort((a, b) => a.hammingDistance - b.hammingDistance);

  return matches.slice(0, limit);
}

/**
 * Checks a new image buffer or perceptual hash against previously accepted deliveries.
 * Returns whether any likely perceptual matches were detected and detailed match metadata.
 *
 * @param bufferOrHash Image buffer or 32-character hex perceptual hash
 * @param options Configurable threshold options
 */
export async function checkPerceptualDuplicate(
  bufferOrHash: Buffer | string,
  options?: CheckPerceptualOptions
): Promise<{
  perceptualHash: string;
  hasLikelyMatch: boolean;
  matches: PerceptualMatchResult[];
  bestMatch?: PerceptualMatchResult;
}> {
  const pHash = Buffer.isBuffer(bufferOrHash)
    ? await calculatePerceptualHash(bufferOrHash)
    : bufferOrHash;

  const matches = await findSimilarReceipts(pHash, options);
  const hasLikelyMatch = matches.length > 0;

  return {
    perceptualHash: pHash,
    hasLikelyMatch,
    matches,
    bestMatch: matches[0],
  };
}

export default {
  HASH_TOTAL_BITS,
  DEFAULT_HAMMING_THRESHOLD,
  calculatePerceptualHash,
  calculateHammingDistance,
  calculateSimilarity,
  getConfiguredThreshold,
  isLikelyModifiedCopy,
  findSimilarReceipts,
  checkPerceptualDuplicate,
};
