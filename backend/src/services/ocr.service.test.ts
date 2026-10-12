import { describe, expect, it, afterAll } from 'vitest';
import sharp from 'sharp';
import {
  extractTextFromSlip,
  preprocessImageForOCR,
  terminateOCRWorker,
  MAX_OCR_IMAGE_SIZE,
} from './ocr.service';
import { parseSlipDetails } from './slipParser.service';

describe('OCR Service', () => {
  afterAll(async () => {
    await terminateOCRWorker();
  });

  describe('Validation & Error Handling', () => {
    it('rejects an empty image buffer', async () => {
      await expect(extractTextFromSlip(Buffer.alloc(0))).rejects.toThrow(
        'A valid, non-empty image buffer is required.'
      );
    });

    it('rejects a null or undefined buffer', async () => {
      // @ts-expect-error Testing invalid runtime input
      await expect(extractTextFromSlip(null)).rejects.toThrow(
        'A valid, non-empty image buffer is required.'
      );
      // @ts-expect-error Testing invalid runtime input
      await expect(extractTextFromSlip(undefined)).rejects.toThrow(
        'A valid, non-empty image buffer is required.'
      );
    });

    it('rejects an image buffer exceeding maximum allowed size', async () => {
      const oversizedBuffer = Buffer.alloc(MAX_OCR_IMAGE_SIZE + 10);
      await expect(extractTextFromSlip(oversizedBuffer)).rejects.toThrow(
        /Image size exceeds the maximum allowed limit/
      );
    });

    it('rejects corrupt non-image bytes with a clean error message', async () => {
      const corruptBuffer = Buffer.from('this is just plain text, not a valid image');
      await expect(extractTextFromSlip(corruptBuffer)).rejects.toThrow(
        'Invalid image: The provided file could not be parsed as a valid image.'
      );
    });
  });

  describe('Sharp Preprocessing', () => {
    it('successfully preprocesses a valid image to PNG format', async () => {
      const svg = `<svg width="100" height="40"><text x="10" y="25" font-size="20">TEST</text></svg>`;
      const rawImage = await sharp(Buffer.from(svg)).png().toBuffer();

      const processed = await preprocessImageForOCR(rawImage);
      expect(Buffer.isBuffer(processed)).toBe(true);
      expect(processed.length).toBeGreaterThan(0);

      const metadata = await sharp(processed).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(40);
    });
  });

  describe('Text Extraction & Recognition', () => {
    it('recognizes text and returns confidence from a generated slip image', async () => {
      const svg = `
        <svg width="400" height="150" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>
          <text x="20" y="80" font-family="Arial" font-size="36" font-weight="bold" fill="black">
            RECEIPT 98765
          </text>
        </svg>
      `;
      const imageBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

      const result = await extractTextFromSlip(imageBuffer);

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('confidence');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.text.toUpperCase()).toContain('RECEIPT');
      expect(result.text).toContain('98765');
    }, 15000);

    it('works properly with reusable worker option enabled', async () => {
      const svg = `
        <svg width="300" height="100" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>
          <text x="20" y="60" font-family="Arial" font-size="30" font-weight="bold" fill="black">
            DELIVERY
          </text>
        </svg>
      `;
      const imageBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

      const result = await extractTextFromSlip(imageBuffer, { reuseWorker: true });

      expect(result.text.toUpperCase()).toContain('DELIVERY');
      expect(result.confidence).toBeGreaterThan(0);
    }, 15000);

    it('accurately recognizes and parses a receipt with standalone 7 above Sales Receipt, date 07/10/2026, and time 11:39', async () => {
      const svg = `
        <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>
          <text x="50" y="50" font-family="Arial" font-size="28" font-weight="bold" fill="black">LEVEL PIZZA</text>
          <text x="50" y="100" font-family="Arial" font-size="32" font-weight="bold" fill="black">7</text>
          <text x="50" y="140" font-family="Arial" font-size="24" font-weight="bold" fill="black">Sales Receipt</text>
          <text x="50" y="190" font-family="Arial" font-size="20" fill="black">Date: 07/10/2026</text>
          <text x="50" y="230" font-family="Arial" font-size="20" fill="black">Time: 11:39</text>
          <text x="50" y="270" font-family="Arial" font-size="20" fill="black">Collection Time: 12:15</text>
          <text x="50" y="310" font-family="Arial" font-size="20" fill="black">Due Time: 12:30</text>
          <text x="50" y="350" font-family="Arial" font-size="20" fill="black">Customer: Amit Verma</text>
        </svg>
      `;
      const imageBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

      const ocrResult = await extractTextFromSlip(imageBuffer, { reuseWorker: true });
      expect(ocrResult.text).toContain('7');
      expect(ocrResult.text).toContain('Sales Receipt');

      const parsed = parseSlipDetails(ocrResult);
      expect(parsed.receiptNo).toBe('7');
      expect(parsed.printedDeliveryDate).toBe('2026-10-07');
      expect(parsed.printedDeliveryTime).toBe('11:39');
      expect(parsed.needsReview).toBe(false);
    }, 20000);
  });
});
