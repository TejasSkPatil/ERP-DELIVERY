import { describe, expect, it, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { extractTextFromSlip } from './services/ocr.service';
import { parseSlipDetails } from './services/slipParser.service';
import { createDeliveryProof, streamSlip } from './controllers/deliveryController';
import { gridfsService } from './services/gridfsService';
import { deliveryService } from './services/deliveryService';
import { Delivery } from './models/Delivery';
import { AcceptedReceipt } from './models/AcceptedReceipt';
import * as receiptRegistryService from './services/receiptRegistry.service';
import * as perceptualHashService from './services/perceptual-hash.service';

vi.mock('./models/Delivery');
vi.mock('./models/AcceptedReceipt');
vi.mock('./services/gridfsService');
vi.mock('./services/receiptRegistry.service');
vi.mock('./services/perceptual-hash.service');

describe('Fixed-Format ERP-DELIVERY OCR Regression Test Matrix', () => {
  const referenceImagePath = path.resolve(__dirname, 'test/fixtures/reference-receipt.png');
  const referenceImageBuffer = fs.readFileSync(referenceImagePath);

  let mockReq: any;
  let mockRes: any;
  let statusMock: any;
  let jsonMock: any;
  const mockDeliveryPersonId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: vi.fn(),
      header: vi.fn(),
    };

    mockReq = {
      user: { userId: mockDeliveryPersonId, role: 'DELIVERY_PERSON' },
      body: {},
      file: {
        buffer: referenceImageBuffer,
        originalname: 'reference-receipt.png',
        mimetype: 'image/png',
      },
    };

    // Default mock behaviors
    vi.mocked(receiptRegistryService.isReceiptRegistered).mockResolvedValue(false);
    vi.mocked(AcceptedReceipt.findOne).mockResolvedValue(null);
    vi.mocked(Delivery.findOne).mockResolvedValue(null);
    vi.mocked(receiptRegistryService.registerReceipt).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      normalizedReceiptNo: '62',
    } as any);
    vi.mocked(perceptualHashService.calculatePerceptualHash).mockResolvedValue('0123456789abcdef0123456789abcdef');
    vi.mocked(perceptualHashService.checkPerceptualDuplicate).mockResolvedValue({
      hasLikelyMatch: false,
      matches: [],
      perceptualHash: '0123456789abcdef0123456789abcdef',
    });
  });

  // --------------------------------------------------------------------------
  // Matrix 1: Reference DELIVERY receipt with number 62, date 16/10/2026, time 00:13
  // --------------------------------------------------------------------------
  it('1. Reference DELIVERY receipt: extracts 62, 16/10/2026, 00:13, DELIVERY with 100% field accuracy and accepts upload', async () => {
    const ocrResult = await extractTextFromSlip(referenceImageBuffer, { reuseWorker: true });
    const parsed = parseSlipDetails(ocrResult);

    expect(parsed.receiptNo).toBe('62');
    expect(parsed.receiptDate).toBe('16/10/2026');
    expect(parsed.receiptTime).toBe('00:13');
    expect(parsed.orderType).toBe('DELIVERY');
    expect(parsed.printedDeliveryDate).toBe('2026-10-16');
    expect(parsed.printedDeliveryTime).toBe('00:13');
    expect(parsed.validationReason).toBe('VALID');

    const mockGridFsId = new mongoose.Types.ObjectId();
    vi.mocked(gridfsService.uploadSlip).mockResolvedValueOnce(mockGridFsId as any);
    vi.mocked(Delivery.create).mockResolvedValueOnce({
      _id: new mongoose.Types.ObjectId(),
      receiptNo: '62',
      receiptDate: '2026-10-16',
      receiptTime: '00:13',
      orderType: 'DELIVERY',
      deliveryPersonId: new mongoose.Types.ObjectId(mockDeliveryPersonId),
      deliveryDate: '2026-10-16',
      uploadedAt: new Date(),
      slipFileId: mockGridFsId,
      status: 'DELIVERED',
    } as any);

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        receiptNo: '62',
        receiptDate: '2026-10-16',
        receiptTime: '00:13',
        orderType: 'DELIVERY',
        slipFileId: mockGridFsId.toString(),
      })
    );
    expect(gridfsService.uploadSlip).toHaveBeenCalledTimes(1);
  }, 25000);

  // --------------------------------------------------------------------------
  // Matrix 2: Reference COLLECTION receipt with number 11, date 15/10/2026, time 14:32
  // Must fail even though number, date, and time are readable!
  // --------------------------------------------------------------------------
  it('2. Reference COLLECTION receipt: fails with COLLECTION_REJECTED even though number, date, and time are readable', async () => {
    const collectionText = `
      11
      Sales Receipt
      Basilico
      15/10/2026
      14:32
      COLLECTION
      Items: 1
      Margherita Basilico £15.70
    `;

    const parsed = parseSlipDetails({ text: collectionText, confidence: 95 });
    expect(parsed.receiptNo).toBe('11');
    expect(parsed.receiptDate).toBe('15/10/2026');
    expect(parsed.receiptTime).toBe('14:32');
    expect(parsed.orderType).toBe('COLLECTION');
    expect(parsed.needsReview).toBe(true);
    expect(parsed.validationReason).toBe('COLLECTION_REJECTED');

    // Simulate upload through controller
    const svg = `
      <svg width="576" height="1024" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <text x="288" y="200" font-family="Arial" font-size="32" font-weight="bold" text-anchor="middle" fill="black">11</text>
        <text x="288" y="260" font-family="Arial" font-size="28" font-weight="bold" text-anchor="middle" fill="black">Sales Receipt</text>
        <text x="50" y="380" font-family="Arial" font-size="22" fill="black">15/10/2026</text>
        <text x="360" y="380" font-family="Arial" font-size="22" fill="black">14:32</text>
        <text x="360" y="420" font-family="Arial" font-size="24" font-weight="bold" fill="black">COLLECTION</text>
        <text x="50" y="480" font-family="Arial" font-size="20" fill="black">Items: 1</text>
      </svg>
    `;
    const collectionBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    mockReq.file.buffer = collectionBuffer;

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(422);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'COLLECTION_REJECTED',
        message: expect.stringContaining("'COLLECTION' slips :Invalid slip"),
      })
    );
    expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
    expect(Delivery.create).not.toHaveBeenCalled();
  }, 20000);

  // --------------------------------------------------------------------------
  // Matrix 3: DELIVERY receipt with mild blur
  // --------------------------------------------------------------------------
  it('3. DELIVERY receipt with mild blur: sharp contrast and unsharp mask recover all required fields', async () => {
    const blurredBuffer = await sharp(referenceImageBuffer).blur(1).png().toBuffer();
    const ocrResult = await extractTextFromSlip(blurredBuffer, { reuseWorker: true });
    const parsed = parseSlipDetails(ocrResult);

    expect(parsed.receiptNo).toBe('62');
    expect(parsed.receiptDate).toBe('16/10/2026');
    expect(parsed.receiptTime).toBe('00:13');
    expect(parsed.orderType).toBe('DELIVERY');
    expect(parsed.validationReason).toBe('VALID');
  }, 25000);

  // --------------------------------------------------------------------------
  // Matrix 4: DELIVERY receipt with low contrast
  // --------------------------------------------------------------------------
  it('4. DELIVERY receipt with low contrast: contrast normalization recovers all required fields', async () => {
    const lowContrastBuffer = await sharp(referenceImageBuffer).linear(0.35, 160).png().toBuffer();
    const ocrResult = await extractTextFromSlip(lowContrastBuffer, { reuseWorker: true });
    const parsed = parseSlipDetails(ocrResult);

    expect(parsed.receiptNo).toBe('62');
    expect(parsed.receiptDate).toBe('16/10/2026');
    expect(parsed.receiptTime).toBe('00:13');
    expect(parsed.orderType).toBe('DELIVERY');
    expect(parsed.validationReason).toBe('VALID');
  }, 25000);

  // --------------------------------------------------------------------------
  // Matrix 5: DELIVERY receipt with rotation or perspective distortion
  // --------------------------------------------------------------------------
  it('5. DELIVERY receipt with rotation: deskew and preprocessing recover all required fields', async () => {
    const rotatedBuffer = await sharp(referenceImageBuffer).rotate(3, { background: '#ffffff' }).png().toBuffer();
    const ocrResult = await extractTextFromSlip(rotatedBuffer, { reuseWorker: true });
    const parsed = parseSlipDetails(ocrResult);

    expect(parsed.receiptNo).toBe('62');
    expect(parsed.receiptDate).toBe('16/10/2026');
    expect(parsed.receiptTime).toBe('00:13');
    expect(parsed.orderType).toBe('DELIVERY');
    expect(parsed.validationReason).toBe('VALID');
  }, 25000);

  // --------------------------------------------------------------------------
  // Matrix 6: Unreadable receipt number
  // --------------------------------------------------------------------------
  it('6. Unreadable receipt number: rejects with RECEIPT_NUMBER_UNREADABLE and does not store in GridFS', async () => {
    const textWithoutReceiptNo = `
      Sales Receipt
      Basilico
      16/10/2026
      00:13
      DELIVERY
      Items: 1
    `;
    const parsed = parseSlipDetails({ text: textWithoutReceiptNo, confidence: 90 });
    expect(parsed.receiptNo).toBeNull();
    expect(parsed.validationReason).toBe('RECEIPT_NUMBER_UNREADABLE');

    const svg = `
      <svg width="576" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <text x="288" y="260" font-family="Arial" font-size="28" font-weight="bold" text-anchor="middle" fill="black">Sales Receipt</text>
        <text x="50" y="380" font-family="Arial" font-size="22" fill="black">16/10/2026</text>
        <text x="360" y="380" font-family="Arial" font-size="22" fill="black">00:13</text>
        <text x="360" y="420" font-family="Arial" font-size="24" font-weight="bold" fill="black">DELIVERY</text>
      </svg>
    `;
    mockReq.file.buffer = await sharp(Buffer.from(svg)).png().toBuffer();

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(422);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'RECEIPT_NUMBER_UNREADABLE',
      })
    );
    expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
    expect(Delivery.create).not.toHaveBeenCalled();
  }, 15000);

  // --------------------------------------------------------------------------
  // Matrix 7: Unreadable date
  // --------------------------------------------------------------------------
  it('7. Unreadable date: rejects with DATE_UNREADABLE and refuses to substitute other numbers', async () => {
    const textWithoutDate = `
      62
      Sales Receipt
      Basilico
      00:13
      DELIVERY
      Items: 1
      Notes: Call customer at 9876543210
    `;
    const parsed = parseSlipDetails({ text: textWithoutDate, confidence: 90 });
    expect(parsed.printedDeliveryDate).toBeNull();
    expect(parsed.validationReason).toBe('DATE_UNREADABLE');
  });

  // --------------------------------------------------------------------------
  // Matrix 8: Unreadable time
  // --------------------------------------------------------------------------
  it('8. Unreadable time: rejects with TIME_UNREADABLE and refuses to substitute due times from notes', async () => {
    const textWithoutTime = `
      62
      Sales Receipt
      Basilico
      16/10/2026
      DELIVERY
      Items: 1
      Due: ASAP 01:00
    `;
    const parsed = parseSlipDetails({ text: textWithoutTime, confidence: 90 });
    expect(parsed.printedDeliveryTime).toBeNull();
    expect(parsed.validationReason).toBe('TIME_UNREADABLE');
  });

  // --------------------------------------------------------------------------
  // Matrix 9: Missing or ambiguous order-type label
  // --------------------------------------------------------------------------
  it('9. Missing or ambiguous order-type label: rejects with ORDER_TYPE_AMBIGUOUS or WEB_ORDER_INSUFFICIENT', async () => {
    const partialDeliverText = `
      62
      Sales Receipt
      Basilico
      16/10/2026
      00:13
      DELIVER
      Items: 1
    `;
    const parsedPartial = parseSlipDetails({ text: partialDeliverText, confidence: 90 });
    expect(parsedPartial.validationReason).toBe('ORDER_TYPE_AMBIGUOUS');

    const webOrderOnlyText = `
      62
      Sales Receipt
      Basilico
      16/10/2026
      00:13
      Web Order
      Items: 1
    `;
    const parsedWeb = parseSlipDetails({ text: webOrderOnlyText, confidence: 90 });
    expect(parsedWeb.validationReason).toBe('WEB_ORDER_INSUFFICIENT');
  });

  // --------------------------------------------------------------------------
  // Matrix 10: Distracting numbers, access codes, prices, and separate due time
  // The DELIVERY example must not be rejected simply because irrelevant text elsewhere is noisy!
  // --------------------------------------------------------------------------
  it('10. Distractors: does not confuse access codes, phone numbers, prices, or due time with required fields', async () => {
    // The reference image contains:
    // - access code: 827130901
    // - phone number: 442033195035
    // - prices: £15.70, £3.99, £3.28, £19.69
    // - separate due time: Due: ASAP 00:34
    // - VAT number: 380937568
    // All 4 required fields must still be recognized accurately!
    const ocrResult = await extractTextFromSlip(referenceImageBuffer, { reuseWorker: true });
    const parsed = parseSlipDetails(ocrResult);

    expect(parsed.receiptNo).toBe('62'); // Not 827130901 or 380937568 or 7470
    expect(parsed.receiptDate).toBe('16/10/2026');
    expect(parsed.receiptTime).toBe('00:13'); // Not 00:34
    expect(parsed.orderType).toBe('DELIVERY');
    expect(parsed.validationReason).toBe('VALID');
  }, 25000);

  // --------------------------------------------------------------------------
  // Matrix 11: Duplicate receipt number and duplicate image
  // --------------------------------------------------------------------------
  it('11. Duplicate prevention: rejects duplicate receipt number and exact SHA-256 duplicate image with 409', async () => {
    // A. Duplicate receipt number
    vi.mocked(receiptRegistryService.isReceiptRegistered).mockResolvedValueOnce(true);

    await createDeliveryProof(mockReq, mockRes);
    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'This receipt has already been delivered.',
      })
    );
    expect(gridfsService.uploadSlip).not.toHaveBeenCalled();

    // Reset mocks for duplicate image check
    vi.clearAllMocks();
    vi.mocked(receiptRegistryService.isReceiptRegistered).mockResolvedValue(false);
    vi.mocked(Delivery.findOne).mockResolvedValue(null);
    vi.mocked(AcceptedReceipt.findOne).mockResolvedValueOnce({
      _id: new mongoose.Types.ObjectId(),
      imageSha256: 'existing-sha',
    } as any);

    await createDeliveryProof(mockReq, mockRes);
    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('already been uploaded'),
      })
    );
    expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
  }, 20000);

  // --------------------------------------------------------------------------
  // Matrix 12: Missing or invalid authentication
  // --------------------------------------------------------------------------
  it('12. Authentication enforcement: rejects unauthenticated requests with 401', async () => {
    mockReq.user = undefined;

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Authentication required'),
      })
    );
    expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Matrix 13: GridFS persistence and authorized image retrieval
  // --------------------------------------------------------------------------
  it('13. GridFS persistence & streaming: streams slip image with proper Content-Type', async () => {
    const mockFileId = new mongoose.Types.ObjectId().toString();
    const { Readable } = await import('stream');
    const mockStream = new Readable();
    mockStream.push(referenceImageBuffer);
    mockStream.push(null);

    vi.mocked(gridfsService.getSlip).mockResolvedValueOnce({
      stream: mockStream as any,
      file: {
        _id: new mongoose.Types.ObjectId(mockFileId),
        length: referenceImageBuffer.length,
        chunkSize: 261120,
        uploadDate: new Date(),
        filename: 'slip_62.png',
        metadata: { contentType: 'image/png' },
      } as any,
    });

    const streamReq: any = {
      params: { fileId: mockFileId },
      user: { userId: mockDeliveryPersonId, role: 'DELIVERY_PERSON' },
    };

    const pipeSpy = vi.spyOn(mockStream, 'pipe');

    await streamSlip(streamReq, mockRes);

    expect(gridfsService.getSlip).toHaveBeenCalledWith(mockFileId);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(pipeSpy).toHaveBeenCalledWith(mockRes);
  });

  // --------------------------------------------------------------------------
  // Matrix 14: Existing retention behavior (32-day purge)
  // --------------------------------------------------------------------------
  it('14. Retention compatibility: purgeOlderThan32Days purges expired deliveries and GridFS files while keeping AcceptedReceipt intact', async () => {
    const expiredSlipId = new mongoose.Types.ObjectId();
    const expiredDelivery = {
      _id: new mongoose.Types.ObjectId(),
      receiptNo: 'OLD-999',
      slipFileId: expiredSlipId,
      uploadedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
    };

    vi.mocked(Delivery.find).mockResolvedValueOnce([expiredDelivery] as any);
    vi.mocked(Delivery.deleteMany).mockResolvedValueOnce({ deletedCount: 1 } as any);
    vi.mocked(gridfsService.deleteSlip).mockResolvedValueOnce(true as any);

    const deletedCount = await deliveryService.purgeOlderThan32Days();

    expect(deletedCount).toBe(1);
    expect(gridfsService.deleteSlip).toHaveBeenCalledWith(expiredSlipId);
    // Critical: AcceptedReceipt permanent deduplication registry is NOT touched by retention purge
    expect(AcceptedReceipt.deleteMany).not.toHaveBeenCalled();
  });
});
