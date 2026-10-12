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
}

export interface OCROptions {
  /**
   * If true, uses a managed reusable worker to reduce worker initialization latency.
   * If false or unspecified, creates a dedicated worker and terminates it in a finally block.
   */
  reuseWorker?: boolean;
}

export const MAX_OCR_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB (Matches application MAX_UPLOAD_SIZE)

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
 * Preprocesses an image buffer using Sharp:
 * - Auto-rotates image according to EXIF orientation metadata (rotation correction)
 * - Resizes oversized images to target width (appropriate resizing)
 * - Converts to grayscale
 * - Enhances contrast with normalization
 * - Sharpens edges for character legibility
 * - Formats to lossless PNG
 */
export async function preprocessImageForOCR(imageBuffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(imageBuffer)
      .rotate()
      .resize({ width: 2000, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();
  } catch (err: any) {
    console.error('[OCR] Image preprocessing failed:', err?.message || err);
    throw new Error('Invalid image: The provided file could not be parsed as a valid image.');
  }
}

/**
 * Extracts text, positional line blocks, and recognition confidence from a delivery slip image buffer.
 *
 * @param imageBuffer Raw image data buffer
 * @param options Optional configuration options
 * @returns OCRResult containing extracted text, confidence, and positional lines
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

      return {
        text: (result.data.text || '').trim(),
        confidence: typeof result.data.confidence === 'number' ? result.data.confidence : 0,
        lines: extractLinesFromResult(result.data),
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

    return {
      text: (result.data.text || '').trim(),
      confidence: typeof result.data.confidence === 'number' ? result.data.confidence : 0,
      lines: extractLinesFromResult(result.data),
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
  terminateOCRWorker,
  MAX_OCR_IMAGE_SIZE,
};
