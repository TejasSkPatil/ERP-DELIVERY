import { createWorker, Worker } from 'tesseract.js';
import sharp from 'sharp';

export interface OCRLine {
  text: string;
  confidence: number;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface OCRResult {
  text: string;
  confidence: number;
  lines?: OCRLine[];
  imageWidth?: number;
  imageHeight?: number;
  templateRegions?: {
    receiptNo?: string | null;
    receiptDate?: string | null;
    receiptTime?: string | null;
    orderType?: string | null;
  };
}

export interface OCROptions {
  /**
   * If true, uses a managed reusable worker to reduce worker initialization latency.
   * If false or unspecified, creates a dedicated worker and terminates it in a finally block.
   */
  reuseWorker?: boolean;
  /**
   * If true, disables targeted region recovery attempts when full slip OCR is missing fields.
   */
  disableRegionRecovery?: boolean;
}

export const MAX_OCR_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB (Matches application MAX_UPLOAD_SIZE)

export type TemplateRegion = 'receiptNo' | 'receiptDate' | 'receiptTime' | 'orderType';

export interface TemplateRegionCrop {
  leftRatio: number;
  topRatio: number;
  widthRatio: number;
  heightRatio: number;
  whitelist: string;
}

/**
 * Normalized bounding ratios for the four template regions:
 * 1. receiptNo: Top-center region centered horizontally above "Sales Receipt"
 * 2. receiptDate: Left-side date region in DD/MM/YYYY format
 * 3. receiptTime: Right-side 24-hr time region aligned with the date
 * 4. orderType: Bold order-type region below the time (never restricted to digits)
 */
export const TEMPLATE_REGION_BOXES: Record<TemplateRegion, TemplateRegionCrop> = {
  receiptNo: {
    leftRatio: 0.15,
    topRatio: 0.15,
    widthRatio: 0.70,
    heightRatio: 0.11,
    whitelist: '0123456789',
  },
  receiptDate: {
    leftRatio: 0.05,
    topRatio: 0.32,
    widthRatio: 0.52,
    heightRatio: 0.10,
    whitelist: '0123456789/.-',
  },
  receiptTime: {
    leftRatio: 0.45,
    topRatio: 0.32,
    widthRatio: 0.50,
    heightRatio: 0.10,
    whitelist: '0123456789:',
  },
  orderType: {
    leftRatio: 0.38,
    topRatio: 0.37,
    widthRatio: 0.58,
    heightRatio: 0.10,
    whitelist: '', // unrestricted character set
  },
};

// Safely managed singleton worker for optional reuse across requests
let sharedWorker: Worker | null = null;
let sharedWorkerInitPromise: Promise<Worker> | null = null;
let workerLock: Promise<any> = Promise.resolve();

/**
 * Cleanly terminates the shared OCR worker if one is currently active.
 * Used during graceful shutdown and test teardown to release worker resources.
 */
export async function terminateOCRWorker(): Promise<void> {
  if (sharedWorker) {
    try {
      await sharedWorker.terminate();
    } catch {
      // Silently ignore termination errors on shutdown
    } finally {
      sharedWorker = null;
      sharedWorkerInitPromise = null;
    }
  }
}

/**
 * Internal helper to acquire or initialize the shared OCR worker.
 */
async function getSharedWorker(): Promise<Worker> {
  if (sharedWorker) {
    return sharedWorker;
  }
  if (!sharedWorkerInitPromise) {
    sharedWorkerInitPromise = (async () => {
      const worker = await createWorker('eng');
      sharedWorker = worker;
      return worker;
    })();
  }
  return sharedWorkerInitPromise;
}

/**
 * Helper to extract line objects and bounding boxes from Tesseract block data.
 */
function extractLinesFromResult(resultData: any): OCRLine[] {
  const lines: OCRLine[] = [];
  if (resultData?.blocks && Array.isArray(resultData.blocks)) {
    for (const block of resultData.blocks) {
      for (const para of (block.paragraphs || [])) {
        for (const line of (para.lines || [])) {
          const lineText = (line.text || '').trim();
          if (lineText) {
            lines.push({
              text: lineText,
              confidence: typeof line.confidence === 'number' ? line.confidence : 0,
              bbox: line.bbox,
            });
          }
        }
      }
    }
  }
  return lines;
}

/**
 * Preprocesses a specific template region using a bounded set of variants:
 * - Resolution-aware 2x upscaling for small thermal receipt fonts (preserves thin strokes)
 * - Variant 0: Standard resolution-aware upscale + grayscale + normalize + gentle sharpening
 * - Variant 1: Denoise + linear contrast stretch + normalize + gentle sharpen (for low contrast / noisy prints)
 * - Variant 2: Adaptive binarization / thresholding (for faded thermal text)
 */
export async function preprocessTemplateRegion(
  imageBuffer: Buffer,
  region: TemplateRegion,
  variantIndex: number = 0,
  deskewAngle: number = 0
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const W = meta.width || 576;
  const H = meta.height || 1024;
  const box = TEMPLATE_REGION_BOXES[region];

  const left = Math.max(0, Math.floor(W * box.leftRatio));
  const top = Math.max(0, Math.floor(H * box.topRatio));
  const width = Math.min(W - left, Math.ceil(W * box.widthRatio));
  const height = Math.min(H - top, Math.ceil(H * box.heightRatio));

  let pipeline = sharp(imageBuffer);

  if (deskewAngle !== 0) {
    pipeline = pipeline.rotate(deskewAngle, { background: '#ffffff' });
  }

  pipeline = pipeline
    .extract({ left, top, width, height })
    .resize({ width: Math.max(width * 2, 400), kernel: 'lanczos3' })
    .grayscale();

  if (variantIndex === 1) {
    // Denoise & contrast linear stretch
    pipeline = pipeline.median(1).linear(1.2, -10).normalize().sharpen({ sigma: 1, m1: 0.5, m2: 2 });
  } else if (variantIndex === 2) {
    // Threshold / binarization for faded receipts
    pipeline = pipeline.normalize().threshold(150);
  } else {
    // Standard enhanced
    pipeline = pipeline.normalize().sharpen({ sigma: 1, m1: 0.5, m2: 2 });
  }

  return await pipeline.png().toBuffer();
}

/**
 * Extracts and strictly validates a candidate value from region OCR text.
 * Never guesses, hallucinates, or defaults missing digits.
 */
export function extractCandidateFromRegionText(region: TemplateRegion, rawText: string): string | null {
  if (!rawText) return null;
  const cleanText = rawText.trim();

  if (region === 'receiptNo') {
    const lines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // 1. Look for standalone line of pure digits
    for (const line of lines) {
      const match = line.match(/^#?\s*(\d{1,8})\s*$/);
      if (match && !/^20\d{2}$/.test(match[1])) {
        return match[1];
      }
    }
    // 2. Look for word of pure digits (excluding 4-digit calendar years 2020-2030)
    const matches = cleanText.match(/\b\d{1,8}\b/g);
    if (matches) {
      const validMatches = matches.filter((m) => !/^20\d{2}$/.test(m));
      if (validMatches.length > 0) {
        return validMatches[0];
      }
    }
    return null;
  }

  if (region === 'receiptDate') {
    const anyDateRegex = /(?<!\d)(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?!\d)/;
    const match = cleanText.match(anyDateRegex);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      if (year >= 2020 && year <= 2035 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const dObj = new Date(Date.UTC(year, month - 1, day));
        if (dObj.getUTCFullYear() === year && dObj.getUTCMonth() === month - 1 && dObj.getUTCDate() === day) {
          return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        }
      }
    }
    return null;
  }

  if (region === 'receiptTime') {
    const timeRegex = /(?<!\d)([01]\d|2[0-3]):([0-5]\d)(?!\d)/;
    const match = cleanText.match(timeRegex);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    return null;
  }

  if (region === 'orderType') {
    if (/\bCOLLECTION\b/i.test(cleanText)) return 'COLLECTION';
    if (/\bDELIVERY\b/i.test(cleanText)) return 'DELIVERY';
    return null;
  }

  return null;
}

/**
 * Preprocesses an image buffer using Sharp:
 * - Auto-rotates image according to EXIF orientation metadata (rotation correction)
 * - Resizes oversized images to target width (appropriate resizing)
 * - Converts to grayscale
 * - Enhances contrast with normalization
 * - Gentle sharpening for character legibility without stroke distortion
 * - Formats to lossless PNG
 */
export async function preprocessImageForOCR(imageBuffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(imageBuffer)
      .rotate()
      .resize({ width: 2000, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1, m1: 0.5, m2: 2 })
      .png()
      .toBuffer();
  } catch (err: any) {
    console.error('[OCR] Image preprocessing failed:', err?.message || err);
    throw new Error('Invalid image: The provided file could not be parsed as a valid image.');
  }
}

/**
 * Executes bounded region attempts for missing required fields using the provided worker.
 * Bounded to at most 3 variants per missing field. Reuses worker and resets whitelists.
 */
async function runBoundedRegionRecovery(
  worker: Worker,
  imageBuffer: Buffer,
  missingFields: TemplateRegion[]
): Promise<Partial<Record<TemplateRegion, string>>> {
  const recovered: Partial<Record<TemplateRegion, string>> = {};

  for (const region of missingFields) {
    const box = TEMPLATE_REGION_BOXES[region];
    // Bounded variants: 0: Standard enhanced, 1: Denoise & contrast stretch, 2: Threshold binarization
    const variantIndices = [0, 1, 2];

    for (const vIdx of variantIndices) {
      try {
        const regionBuf = await preprocessTemplateRegion(imageBuffer, region, vIdx);
        if (box.whitelist) {
          await worker.setParameters({ tessedit_char_whitelist: box.whitelist });
        } else {
          await worker.setParameters({ tessedit_char_whitelist: '' });
        }

        const res = await worker.recognize(regionBuf);
        const candidate = extractCandidateFromRegionText(region, res.data.text || '');

        if (candidate) {
          recovered[region] = candidate;
          break; // Succeeded for this region; avoid unnecessary additional variants
        }
      } catch {
        // Continue to next variant attempt
      }
    }
    // Always reset character whitelist after each region
    await worker.setParameters({ tessedit_char_whitelist: '' }).catch(() => {});
  }

  return recovered;
}

/**
 * Identifies which template regions need recovery given the full slip OCR text.
 */
function identifyMissingTemplateRegions(text: string, lines: OCRLine[]): TemplateRegion[] {
  const missing: TemplateRegion[] = [];
  const lineTexts = lines.length > 0 ? lines.map((l) => l.text) : text.split(/\r?\n/);

  // Check receiptNo: standalone number near top or above Sales Receipt
  const salesReceiptIdx = lineTexts.findIndex((l) => /\bsales\s*receipt\b/i.test(l));
  let hasReceiptNo = false;
  if (salesReceiptIdx > 0) {
    for (let i = salesReceiptIdx - 1; i >= Math.max(0, salesReceiptIdx - 3); i--) {
      const nums = lineTexts[i].match(/\b\d{1,8}\b/g)?.filter((n) => !/^20\d{2}$/.test(n));
      if (nums && nums.length > 0) {
        hasReceiptNo = true;
        break;
      }
    }
  } else {
    for (let i = 0; i < Math.min(lineTexts.length, 3); i++) {
      const match = lineTexts[i].match(/^#?\s*(\d{1,8})\s*$/);
      if (match && !/^20\d{2}$/.test(match[1])) {
        hasReceiptNo = true;
        break;
      }
    }
  }
  if (!hasReceiptNo) missing.push('receiptNo');

  // Check date: valid DD/MM/YYYY
  const dateRegex = /(?<!\d)(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?!\d)/;
  const hasDate = lineTexts.some((l) => !/(?:due|asap|notes|deliver)/i.test(l) && dateRegex.test(l));
  if (!hasDate) missing.push('receiptDate');

  // Check time: valid HH:mm
  const timeRegex = /(?<!\d)([01]\d|2[0-3]):([0-5]\d)(?!\d)/;
  const hasTime = lineTexts.some(
    (l) => !/(?:due|asap|deliver|item|margherita|notes|subtotal|charges|tax|paid|vat\b)/i.test(l) && timeRegex.test(l)
  );
  if (!hasTime) missing.push('receiptTime');

  // Check orderType: DELIVERY or COLLECTION
  const itemsStartIdx = lineTexts.findIndex((l) => /^(?:items?:|item\b|notes?:|subtotal|charges|tax)/i.test(l));
  const headerLines = itemsStartIdx !== -1 ? lineTexts.slice(0, itemsStartIdx) : lineTexts.slice(0, 15);
  const hasOrderType = headerLines.some(
    (l) => !/(?:charges|deliver\s*to)/i.test(l) && /\b(?:DELIVERY|COLLECTION)\b/i.test(l)
  );
  if (!hasOrderType) missing.push('orderType');

  return missing;
}

/**
 * Extracts text, positional line blocks, and recognition confidence from a delivery slip image buffer.
 * Automatically recovers missing template fields via bounded region-based recognition.
 *
 * @param imageBuffer Raw image data buffer
 * @param options Optional configuration options
 * @returns OCRResult containing extracted text, confidence, positional lines, and templateRegions
 */
export async function extractTextFromSlip(
  imageBuffer: Buffer,
  options: OCROptions = {}
): Promise<OCRResult> {
  // 1. Reject empty or non-buffer input with a clear error
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error('A valid, non-empty image buffer is required.');
  }

  // 2. Enforce upload size limit
  if (imageBuffer.length > MAX_OCR_IMAGE_SIZE) {
    throw new Error(
      `Image size exceeds the maximum allowed limit of ${MAX_OCR_IMAGE_SIZE / (1024 * 1024)}MB.`
    );
  }

  // 3. Preprocess image with Sharp (rotation, grayscale, contrast enhancement, resizing)
  const processedImage = await preprocessImageForOCR(imageBuffer);
  let imageWidth: number | undefined;
  let imageHeight: number | undefined;
  try {
    const meta = await sharp(processedImage).metadata();
    imageWidth = meta.width;
    imageHeight = meta.height;
  } catch {
    // Ignore metadata reading error
  }

  // 4. Determine whether to reuse a safely managed shared worker
  const shouldReuse = options.reuseWorker ?? (process.env.REUSE_OCR_WORKER === 'true');

  if (shouldReuse) {
    // Acquire worker queue lock
    let releaseLock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const previousLock = workerLock;
    workerLock = previousLock.then(() => lockPromise);

    await previousLock;

    try {
      const worker = await getSharedWorker();
      const result = await worker.recognize(processedImage, {}, { blocks: true, text: true });

      const extractedLines = extractLinesFromResult(result.data);
      const rawText = (result.data.text || '').trim();

      let templateRegions: Record<string, string | null> | undefined;

      if (!options.disableRegionRecovery) {
        const missing = identifyMissingTemplateRegions(rawText, extractedLines);
        if (missing.length > 0) {
          const recovered = await runBoundedRegionRecovery(worker, imageBuffer, missing);
          if (Object.keys(recovered).length > 0) {
            templateRegions = recovered;
          }
        }
      }

      return {
        text: rawText,
        confidence: typeof result.data.confidence === 'number' ? result.data.confidence : 0,
        lines: extractedLines,
        imageWidth,
        imageHeight,
        templateRegions,
      };
    } catch (err: any) {
      console.error('[OCR] Shared worker recognition failed:', err?.message || err);
      // Clean up damaged worker
      if (sharedWorker) {
        try {
          await sharedWorker.terminate();
        } catch {
          // Ignore cleanup error
        }
        sharedWorker = null;
        sharedWorkerInitPromise = null;
      }
      throw new Error('OCR recognition failed. Unable to read delivery slip.');
    } finally {
      releaseLock();
    }
  }

  // 5. Dedicated worker execution: Always terminate the worker in a finally block
  let worker: Worker | null = null;

  try {
    worker = await createWorker('eng');
    const result = await worker.recognize(processedImage, {}, { blocks: true, text: true });

    const extractedLines = extractLinesFromResult(result.data);
    const rawText = (result.data.text || '').trim();

    let templateRegions: Record<string, string | null> | undefined;

    if (!options.disableRegionRecovery) {
      const missing = identifyMissingTemplateRegions(rawText, extractedLines);
      if (missing.length > 0) {
        const recovered = await runBoundedRegionRecovery(worker, imageBuffer, missing);
        if (Object.keys(recovered).length > 0) {
          templateRegions = recovered;
        }
      }
    }

    return {
      text: rawText,
      confidence: typeof result.data.confidence === 'number' ? result.data.confidence : 0,
      lines: extractedLines,
      imageWidth,
      imageHeight,
      templateRegions,
    };
  } catch (err: any) {
    console.error('[OCR] Recognition failed:', err?.message || err);
    throw new Error('OCR recognition failed. Unable to read delivery slip.');
  } finally {
    // Always terminate the OCR worker in a finally block
    if (worker) {
      await worker.terminate().catch(() => {});
    }
  }
}

export default {
  extractTextFromSlip,
  preprocessImageForOCR,
  preprocessTemplateRegion,
  extractCandidateFromRegionText,
  terminateOCRWorker,
  TEMPLATE_REGION_BOXES,
  MAX_OCR_IMAGE_SIZE,
};
