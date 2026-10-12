import crypto from 'crypto';
import { AcceptedReceipt, IAcceptedReceiptDocument } from '../models/AcceptedReceipt';
import { InMemoryDatabase } from '../config/database';

/**
 * Calculates a deterministic SHA-256 hash of raw, original image bytes.
 * NOTE: Must be calculated from the original uploaded file buffer, NOT the preprocessed OCR image.
 *
 * @param buffer Raw original uploaded image buffer
 * @returns 64-character lowercase hexadecimal SHA-256 digest
 */
export function calculateImageSha256(buffer: Buffer): string {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('A valid, non-empty image buffer is required to calculate SHA-256 hash.');
  }

  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Checks whether an image with the given SHA-256 hash has already been accepted in the permanent registry.
 *
 * @param imageSha256 64-character hexadecimal SHA-256 hash
 * @returns true if an exact duplicate image exists in the registry
 */
export async function isImageDuplicate(imageSha256: string): Promise<boolean> {
  if (!imageSha256 || typeof imageSha256 !== 'string') {
    return false;
  }

  const existing = await findReceiptByImageHash(imageSha256);
  return !!existing;
}

/**
 * Finds the existing permanent AcceptedReceipt record associated with an exact image SHA-256 hash.
 *
 * @param imageSha256 64-character hexadecimal SHA-256 hash
 * @returns The existing AcceptedReceipt document, or null if no duplicate exists
 */
export async function findReceiptByImageHash(
  imageSha256: string
): Promise<IAcceptedReceiptDocument | null> {
  if (!imageSha256 || typeof imageSha256 !== 'string') {
    return null;
  }

  if (InMemoryDatabase.isUsingFallback) {
    const found = (InMemoryDatabase.deliveries || []).find(
      (d) => d.imageSha256 === imageSha256
    );
    return (found as unknown as IAcceptedReceiptDocument) || null;
  }

  return await AcceptedReceipt.findOne({ imageSha256 });
}

export {
  calculatePerceptualHash,
  calculateHammingDistance,
  calculateSimilarity,
  isLikelyModifiedCopy,
  findSimilarReceipts,
  checkPerceptualDuplicate,
  DEFAULT_HAMMING_THRESHOLD,
  HASH_TOTAL_BITS,
} from './perceptual-hash.service';

export default {
  calculateImageSha256,
  isImageDuplicate,
  findReceiptByImageHash,
};
