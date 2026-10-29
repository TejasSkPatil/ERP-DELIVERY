/**
 * In-memory and session-persistent cache for delivery receipt slip images.
 * Guarantees that freshly uploaded or viewed receipts can be displayed
 * instantaneously and fallback seamlessly even if network or serverless cold-starts occur.
 */

const memoryCache = new Map<string, string>();
const STORAGE_PREFIX = 'erp_slip_img_';

const normalizeKey = (key?: string | null): string => {
  if (!key) return '';
  return String(key).trim().toLowerCase();
};

export const cacheSlipImage = (key?: string | null, imageUrl?: string | null): void => {
  if (!key || !imageUrl) return;
  const cleanKey = normalizeKey(key);
  if (!cleanKey) return;

  memoryCache.set(cleanKey, imageUrl);

  // Attempt sessionStorage storage (protecting against quota or security limits)
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(`${STORAGE_PREFIX}${cleanKey}`, imageUrl);
    }
  } catch {
    // Quota exceeded or storage disabled - in-memory cache remains active
  }
};

export const getCachedSlipImage = (key?: string | null): string | null => {
  if (!key) return null;
  const cleanKey = normalizeKey(key);
  if (!cleanKey) return null;

  // 1. Check in-memory cache
  if (memoryCache.has(cleanKey)) {
    return memoryCache.get(cleanKey)!;
  }

  // 2. Check sessionStorage
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem(`${STORAGE_PREFIX}${cleanKey}`);
      if (stored) {
        memoryCache.set(cleanKey, stored);
        return stored;
      }
    }
  } catch {
    // Ignore storage errors
  }

  return null;
};

export const cacheDeliverySlipImages = (delivery: {
  id?: string;
  receiptNo?: string;
  slipFileId?: string;
  slipImageUrl?: string;
}): void => {
  const url = delivery.slipImageUrl;
  if (!url) return;

  if (delivery.receiptNo) cacheSlipImage(delivery.receiptNo, url);
  if (delivery.slipFileId) cacheSlipImage(delivery.slipFileId, url);
  if (delivery.id) cacheSlipImage(delivery.id, url);
};

export default {
  cacheSlipImage,
  getCachedSlipImage,
  cacheDeliverySlipImages,
};
