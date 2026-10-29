import { describe, expect, it, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { createDeliveryProof } from './deliveryController';
import { Delivery } from '../models/Delivery';
import { gridfsService } from '../services/gridfsService';
import * as ocrService from '../services/ocr.service';
import * as receiptRegistryService from '../services/receiptRegistry.service';
import * as perceptualHashService from '../services/perceptual-hash.service';
import { AcceptedReceipt } from '../models/AcceptedReceipt';

vi.mock('../models/Delivery');
vi.mock('../models/AcceptedReceipt');
vi.mock('../services/gridfsService');
vi.mock('../services/ocr.service');
vi.mock('../services/receiptRegistry.service');
vi.mock('../services/perceptual-hash.service');

describe('Delivery Controller - createDeliveryProof & OCR Integration', () => {
  let mockReq: any;
  let mockRes: any;
  let statusMock: any;
  let jsonMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockReq = {
      user: { userId: new mongoose.Types.ObjectId().toString(), role: 'DELIVERY_PERSON' },
      body: {
        receiptNo: 'REC-1001',
        recipientName: 'Acme Corp',
      },
      file: {
        buffer: Buffer.from('fake-slip-image-bytes'),
        originalname: 'slip.jpg',
        mimetype: 'image/jpeg',
      },
    };

    // Default mock setup: receipt is not registered yet
    vi.mocked(receiptRegistryService.isReceiptRegistered).mockResolvedValue(false);
    vi.mocked(receiptRegistryService.computeImageSha256).mockReturnValue('mock-sha256-hash-value');
    vi.mocked(receiptRegistryService.registerReceipt).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      normalizedReceiptNo: 'REC-1001',
    } as any);
    vi.mocked(perceptualHashService.calculatePerceptualHash).mockResolvedValue(
      '0123456789abcdef0123456789abcdef'
    );
    vi.mocked(perceptualHashService.checkPerceptualDuplicate).mockResolvedValue({
      hasLikelyMatch: false,
      matches: [],
      perceptualHash: '0123456789abcdef0123456789abcdef',
    });
  });

  it('rejects request with 401 if delivery person ID is missing from auth context', async () => {
    mockReq.user = undefined;

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Authentication required'),
      })
    );
  });

  it('rejects request with 400 if receiptNo is empty or missing', async () => {
    mockReq.body.receiptNo = '   ';

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Receipt number (receiptNo) is required'),
      })
    );
  });

  it('rejects duplicate delivery with 409 if receipt is already in permanent AcceptedReceipt registry', async () => {
    vi.mocked(receiptRegistryService.isReceiptRegistered).mockResolvedValueOnce(true);

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: 'This receipt has already been delivered.',
    });
    expect(ocrService.extractTextFromSlip).not.toHaveBeenCalled();
    expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
  });

  it('rejects duplicate delivery with 409 if receipt exists in active Deliveries', async () => {
    vi.mocked(receiptRegistryService.isReceiptRegistered).mockResolvedValueOnce(false);
    vi.mocked(Delivery.findOne).mockResolvedValueOnce({
      _id: new mongoose.Types.ObjectId(),
      receiptNo: 'REC-1001',
      status: 'DELIVERED',
    } as any);

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: 'This receipt has already been delivered.',
    });
    expect(ocrService.extractTextFromSlip).not.toHaveBeenCalled();
    expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
  });

  it('rejects request with 400 if slip image file is missing', async () => {
    vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
    mockReq.file = undefined;

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Delivery proof image slip is required.',
      })
    );
  });

  it('returns 422 when OCR service throws an unreadable image error', async () => {
    vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
    vi.mocked(ocrService.extractTextFromSlip).mockRejectedValueOnce(
      new Error('Tesseract recognition failed')
    );

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(422);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: 'Unable to read the delivery slip. Please upload a clearer image.',
    });
    expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
  });

  it('returns 422 when OCR returns empty extracted text', async () => {
    vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
    vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
      text: '',
      confidence: 0,
    });

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(422);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: 'No text could be extracted. Please upload a clearer slip image.',
    });
    expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
  });

  it('returns 422 structured review response when OCR cannot identify receipt number', async () => {
    vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
    vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
      text: 'Delivery Proof without any readable docket or receipt code',
      confidence: 70,
    });

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(422);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        requiresReview: true,
        message: expect.stringContaining('Receipt number could not be confidently identified'),
        ocr: expect.objectContaining({
          extractedReceiptNo: null,
          submittedReceiptNo: 'REC-1001',
          isVerified: false,
          needsReview: true,
        }),
      })
    );
    expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
  });

  it('returns 422 structured review response when OCR detected receipt does not match submitted receipt', async () => {
    vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
    vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
      text: 'LEVEL LOGISTICS\nReceipt No: REC-8888\nDate: 11 Oct 2026',
      confidence: 88,
    });

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(422);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        requiresReview: true,
        message: expect.stringContaining('does not match'),
        ocr: expect.objectContaining({
          extractedReceiptNo: 'REC-8888',
          submittedReceiptNo: 'REC-1001',
          isVerified: false,
          needsReview: true,
        }),
      })
    );
    expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
  });

  it('handles MongoDB duplicate key error during concurrent uploads and returns 409 without uploading to GridFS', async () => {
    vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
    vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
      text: 'LEVEL LOGISTICS\nReceipt No: REC-1001',
      confidence: 90,
    });

    // Simulate MongoDB unique index duplicate key error (code 11000) during reservation
    const duplicateKeyErr: any = new Error('E11000 duplicate key error collection: acceptedreceipts');
    duplicateKeyErr.code = 11000;
    vi.mocked(receiptRegistryService.registerReceipt).mockRejectedValueOnce(duplicateKeyErr);

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: 'This receipt has already been delivered.',
    });
    // Reservation stopped the request before uploading large file to GridFS!
    expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
  });

  it('succeeds with 201 when OCR receipt matches submitted receiptNo with high confidence', async () => {
    vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
    vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
      text: 'LEVEL LOGISTICS\nReceipt No: #REC-1001\nDelivery Date: 11 Oct 2026\nTime: 02:30 PM',
      confidence: 94,
    });

    const mockSlipId = new mongoose.Types.ObjectId();
    vi.mocked(gridfsService.uploadSlip).mockResolvedValueOnce(mockSlipId as any);

    const mockSavedDelivery = {
      _id: new mongoose.Types.ObjectId(),
      receiptNo: 'REC-1001',
      recipientName: 'Acme Corp',
      deliveryDate: '2026-10-11',
      uploadedAt: new Date(),
      status: 'DELIVERED',
      slipFileId: mockSlipId,
    };
    vi.mocked(Delivery.create).mockResolvedValueOnce(mockSavedDelivery as any);

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Delivery recorded successfully',
        receiptNo: 'REC-1001',
        ocr: expect.objectContaining({
          extractedReceiptNo: 'REC-1001',
          printedDeliveryDate: '2026-10-11',
          printedDeliveryTime: '14:30',
          isVerified: true,
          needsReview: false,
          isManualCorrection: false,
        }),
      })
    );
    expect(gridfsService.uploadSlip).toHaveBeenCalled();
    expect(receiptRegistryService.registerReceipt).toHaveBeenCalled();
  });

  it('succeeds with 201 when delivery person confirms manual correction on unverified OCR', async () => {
    vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
    vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
      text: 'Smudged receipt slip text',
      confidence: 35,
    });

    mockReq.body.confirmedManualReceipt = 'true';

    const mockSlipId = new mongoose.Types.ObjectId();
    vi.mocked(gridfsService.uploadSlip).mockResolvedValueOnce(mockSlipId as any);

    const mockSavedDelivery = {
      _id: new mongoose.Types.ObjectId(),
      receiptNo: 'REC-1001',
      recipientName: 'Acme Corp',
      deliveryDate: '2026-10-11',
      uploadedAt: new Date(),
      status: 'DELIVERED',
      slipFileId: mockSlipId,
    };
    vi.mocked(Delivery.create).mockResolvedValueOnce(mockSavedDelivery as any);

    await createDeliveryProof(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        ocr: expect.objectContaining({
          isManualCorrection: true,
        }),
      })
    );
    expect(gridfsService.uploadSlip).toHaveBeenCalled();
  });

  it('cleans up orphaned GridFS file and rolls back AcceptedReceipt if Delivery creation fails', async () => {
    vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
    vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
      text: 'Receipt No: REC-1001',
      confidence: 90,
    });

    const mockSlipId = new mongoose.Types.ObjectId();
    const mockReceiptId = new mongoose.Types.ObjectId();
    vi.mocked(gridfsService.uploadSlip).mockResolvedValueOnce(mockSlipId as any);
    vi.mocked(receiptRegistryService.registerReceipt).mockResolvedValueOnce({
      _id: mockReceiptId,
      normalizedReceiptNo: 'REC-1001',
    } as any);
    vi.mocked(Delivery.create).mockRejectedValueOnce(new Error('Database write connection lost'));

    await createDeliveryProof(mockReq, mockRes);

    expect(AcceptedReceipt.deleteOne).toHaveBeenCalledWith({ _id: mockReceiptId });
    expect(gridfsService.deleteSlip).toHaveBeenCalledWith(mockSlipId.toString());
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Internal server error'),
      })
    );
  });

  describe('Phase 4: Exact-image duplicate detection using SHA-256', () => {
    it('rejects exact duplicate image with 409 Conflict before saving to GridFS', async () => {
      vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: 'Receipt No: REC-1001',
        confidence: 95,
      });
      // Simulate that this exact image hash already exists in AcceptedReceipt
      vi.mocked(AcceptedReceipt.findOne).mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        normalizedReceiptNo: 'REC-0999',
        imageSha256: 'mock-hash',
      } as any);

      await createDeliveryProof(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'This delivery slip image has already been uploaded and processed.',
      });
      // Crucial: Must NOT upload duplicate image to GridFS
      expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
      expect(receiptRegistryService.registerReceipt).not.toHaveBeenCalled();
    });

    it('prevents the same exact image from being accepted under a different receipt number', async () => {
      vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
      mockReq.body.receiptNo = 'DIFFERENT-REC-9999';
      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: 'Receipt No: DIFFERENT-REC-9999',
        confidence: 90,
      });
      // Image already accepted previously under REC-0001
      vi.mocked(AcceptedReceipt.findOne).mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        normalizedReceiptNo: 'REC-0001',
      } as any);

      await createDeliveryProof(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'This delivery slip image has already been uploaded and processed.',
      });
      expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
    });

    it('safely handles concurrent upload race condition when MongoDB reports duplicate key on imageSha256', async () => {
      vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: 'Receipt No: REC-1001',
        confidence: 95,
      });
      // Pre-check passed (concurrent uploads happened in parallel)
      vi.mocked(AcceptedReceipt.findOne).mockResolvedValueOnce(null);

      // Unique constraint on imageSha256 trips during registerReceipt
      const duplicateError: any = new Error('E11000 duplicate key error collection: erp.acceptedreceipts index: imageSha256_1 dup key');
      duplicateError.code = 11000;
      duplicateError.keyPattern = { imageSha256: 1 };
      vi.mocked(receiptRegistryService.registerReceipt).mockRejectedValueOnce(duplicateError);

      await createDeliveryProof(mockReq, mockRes);

      // Must NOT upload duplicate image to GridFS when reservation trips
      expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'This delivery slip image has already been uploaded and processed.',
      });
    });

    it('safely handles concurrent upload race condition when MongoDB reports duplicate key on normalizedReceiptNo', async () => {
      vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: 'Receipt No: REC-1001',
        confidence: 95,
      });
      vi.mocked(AcceptedReceipt.findOne).mockResolvedValueOnce(null);

      const duplicateError: any = new Error('E11000 duplicate key error collection: erp.acceptedreceipts index: normalizedReceiptNo_1 dup key');
      duplicateError.code = 11000;
      duplicateError.keyPattern = { normalizedReceiptNo: 1 };
      vi.mocked(receiptRegistryService.registerReceipt).mockRejectedValueOnce(duplicateError);

      await createDeliveryProof(mockReq, mockRes);

      expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'This receipt has already been delivered.',
      });
    });
  });

  describe('Phase 6: Integrate duplicate protection with upload workflow & failure handling', () => {
    it('releases reserved receipt and does not create delivery if GridFS upload fails', async () => {
      vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: 'Receipt No: REC-1001',
        confidence: 95,
      });

      const mockReceiptId = new mongoose.Types.ObjectId();
      vi.mocked(receiptRegistryService.registerReceipt).mockResolvedValueOnce({
        _id: mockReceiptId,
        normalizedReceiptNo: 'REC-1001',
      } as any);

      // GridFS upload fails (e.g. disk full or network error)
      vi.mocked(gridfsService.uploadSlip).mockRejectedValueOnce(new Error('GridFS write stream closed prematurely'));

      await createDeliveryProof(mockReq, mockRes);

      // Must release the reservation created by this failed attempt
      expect(AcceptedReceipt.deleteOne).toHaveBeenCalledWith({ _id: mockReceiptId });
      // Delivery must not be created
      expect(Delivery.create).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Internal server error'),
        })
      );
    });

    it('cleans up orphaned GridFS file and releases only this attempt reservation if Delivery creation fails', async () => {
      vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: 'Receipt No: REC-1001',
        confidence: 95,
      });

      const mockReceiptId = new mongoose.Types.ObjectId();
      const mockSlipId = new mongoose.Types.ObjectId();
      vi.mocked(receiptRegistryService.registerReceipt).mockResolvedValueOnce({
        _id: mockReceiptId,
        normalizedReceiptNo: 'REC-1001',
      } as any);
      vi.mocked(gridfsService.uploadSlip).mockResolvedValueOnce(mockSlipId as any);
      vi.mocked(Delivery.create).mockRejectedValueOnce(new Error('Mongoose validation error on Delivery'));

      await createDeliveryProof(mockReq, mockRes);

      // Must clean up GridFS file and release ONLY this attempt's reservation
      expect(gridfsService.deleteSlip).toHaveBeenCalledWith(mockSlipId.toString());
      expect(AcceptedReceipt.deleteOne).toHaveBeenCalledWith({ _id: mockReceiptId });
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('Phase 5: Detect likely modified copies using perceptual hashing', () => {
    it('flags likely perceptual duplicate for manual review without automatically rejecting upload', async () => {
      vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: 'Receipt No: REC-1001',
        confidence: 95,
      });

      // Simulate that perceptual check detected a likely modified copy of a previous slip
      const matchedReceiptItem = {
        receiptId: 'prev-rec-id',
        normalizedReceiptNo: 'REC-OLD-01',
        originalReceiptNo: 'REC-OLD-01',
        perceptualHash: '0123456789abcdef0123456789abcdef',
        imageSha256: 'old-sha256',
        hammingDistance: 4,
        similarity: 0.969,
      };

      vi.mocked(perceptualHashService.checkPerceptualDuplicate).mockResolvedValueOnce({
        hasLikelyMatch: true,
        matches: [matchedReceiptItem],
        perceptualHash: '0123456789abcdef0123456789abcdef',
      });

      const mockSlipId = new mongoose.Types.ObjectId();
      const mockSavedDelivery = {
        _id: new mongoose.Types.ObjectId(),
        receiptNo: 'REC-1001',
        recipientName: 'Acme Corp',
        deliveryDate: '2026-10-11',
        uploadedAt: new Date(),
        status: 'DELIVERED',
        slipFileId: mockSlipId,
      };
      vi.mocked(gridfsService.uploadSlip).mockResolvedValueOnce(mockSlipId as any);
      vi.mocked(Delivery.create).mockResolvedValueOnce(mockSavedDelivery as any);

      await createDeliveryProof(mockReq, mockRes);

      // Must NOT reject! 201 Created should be returned with flags
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          ocr: expect.objectContaining({
            needsReview: true, // Flagged for review
            isVerified: false,
          }),
          duplicateCheck: expect.objectContaining({
            isExactDuplicate: false,
            perceptualMatchDetected: true,
            matchedReceipts: [
              expect.objectContaining({
                receiptNo: 'REC-OLD-01',
                hammingDistance: 4,
                similarity: 0.969,
              }),
            ],
          }),
        })
      );

      // Receipt must be durably registered with perceptual match metadata
      expect(receiptRegistryService.registerReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          normalizedReceiptNo: 'REC-1001',
          perceptualHash: '0123456789abcdef0123456789abcdef',
          metadata: expect.objectContaining({
            perceptualMatchDetected: true,
          }),
        })
      );
    });

    it('returns successful 201 with perceptualMatchDetected false when image is unique', async () => {
      vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: 'Receipt No: REC-1001',
        confidence: 95,
      });

      vi.mocked(perceptualHashService.checkPerceptualDuplicate).mockResolvedValueOnce({
        hasLikelyMatch: false,
        matches: [],
        perceptualHash: '0123456789abcdef0123456789abcdef',
      });

      const mockSlipId = new mongoose.Types.ObjectId();
      const mockSavedDelivery = {
        _id: new mongoose.Types.ObjectId(),
        receiptNo: 'REC-1001',
        recipientName: 'Acme Corp',
        deliveryDate: '2026-10-11',
        uploadedAt: new Date(),
        status: 'DELIVERED',
        slipFileId: mockSlipId,
      };
      vi.mocked(gridfsService.uploadSlip).mockResolvedValueOnce(mockSlipId as any);
      vi.mocked(Delivery.create).mockResolvedValueOnce(mockSavedDelivery as any);

      await createDeliveryProof(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          ocr: expect.objectContaining({
            needsReview: false,
            isVerified: true,
          }),
          duplicateCheck: expect.objectContaining({
            isExactDuplicate: false,
            perceptualMatchDetected: false,
            matchedReceipts: [],
          }),
        })
      );
    });
  });

  describe('Automatic OCR Mode (Receipt No and Customer omitted from request)', () => {
    it('succeeds with 201 and persists receiptNo, receiptDate, receiptTime from OCR when receiptNo is not provided', async () => {
      delete mockReq.body.receiptNo;
      delete mockReq.body.recipientName;

      vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: 'LEVEL LOGISTICS\nReceipt No: #AUTO-777\nDelivery Date: 11 Oct 2026\nTime: 05:45 PM',
        confidence: 96,
      });

      const mockSlipId = new mongoose.Types.ObjectId();
      const mockSavedDelivery = {
        _id: new mongoose.Types.ObjectId(),
        receiptNo: 'AUTO-777',
        receiptDate: '2026-10-11',
        receiptTime: '17:45',
        recipientName: 'Standard Recipient',
        deliveryDate: '2026-10-11',
        uploadedAt: new Date(),
        status: 'DELIVERED',
        slipFileId: mockSlipId,
      };
      vi.mocked(gridfsService.uploadSlip).mockResolvedValueOnce(mockSlipId as any);
      vi.mocked(Delivery.create).mockResolvedValueOnce(mockSavedDelivery as any);

      await createDeliveryProof(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          receiptNo: 'AUTO-777',
          receiptDate: '2026-10-11',
          receiptTime: '17:45',
          slipFileId: mockSlipId.toString(),
        })
      );
      expect(Delivery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          receiptNo: 'AUTO-777',
          receiptDate: '2026-10-11',
          receiptTime: '17:45',
          slipFileId: mockSlipId,
        })
      );
    });

    it('returns 422 if required OCR receipt date or time cannot be read from the slip in automatic mode', async () => {
      delete mockReq.body.receiptNo;

      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: 'LEVEL LOGISTICS\nReceipt No: #AUTO-777', // missing date and time
        confidence: 85,
      });

      await createDeliveryProof(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Receipt date could not be read'),
        })
      );
      expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
    });

    it('returns 409 if automatically extracted receipt is already registered', async () => {
      delete mockReq.body.receiptNo;

      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: 'LEVEL LOGISTICS\nReceipt No: #AUTO-777\nDelivery Date: 11 Oct 2026\nTime: 05:45 PM',
        confidence: 95,
      });
      vi.mocked(receiptRegistryService.isReceiptRegistered).mockResolvedValueOnce(true);

      await createDeliveryProof(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'This receipt has already been delivered.',
      });
      expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
    });

    it('succeeds with 201 for standalone receipt number 7 above Sales Receipt, date 07/10/2026, and time 11:39', async () => {
      delete mockReq.body.receiptNo;
      delete mockReq.body.recipientName;

      vi.mocked(Delivery.findOne).mockResolvedValueOnce(null);
      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: 'LEVEL PIZZA\n7\nSales Receipt\nDate: 07/10/2026\nTime: 11:39\nCollection Time: 12:15\nDue Time: 12:30\nCustomer: Amit Verma',
        confidence: 94,
      });

      const mockSlipId = new mongoose.Types.ObjectId();
      const mockSavedDelivery = {
        _id: new mongoose.Types.ObjectId(),
        receiptNo: '7',
        receiptDate: '2026-10-07',
        receiptTime: '11:39',
        recipientName: 'Standard Recipient',
        deliveryDate: '2026-10-07',
        uploadedAt: new Date(),
        status: 'DELIVERED',
        slipFileId: mockSlipId,
      };
      vi.mocked(gridfsService.uploadSlip).mockResolvedValueOnce(mockSlipId as any);
      vi.mocked(Delivery.create).mockResolvedValueOnce(mockSavedDelivery as any);

      await createDeliveryProof(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          receiptNo: '7',
          receiptDate: '2026-10-07',
          receiptTime: '11:39',
          slipFileId: mockSlipId.toString(),
        })
      );
      expect(Delivery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          receiptNo: '7',
          receiptDate: '2026-10-07',
          receiptTime: '11:39',
        })
      );
    });

    it('returns 422 when receipt candidates are ambiguous and require review', async () => {
      delete mockReq.body.receiptNo;

      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: 'STORE\nReceipt No: 1001\nDocket No: 9999\nDate: 07/10/2026\nTime: 11:39',
        confidence: 85,
      });

      await createDeliveryProof(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('ambiguous or below the reliability threshold'),
        })
      );
      expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
    });

    it('succeeds with 201 for a valid DELIVERY template receipt', async () => {
      delete mockReq.body.receiptNo;
      const mockUserId = new mongoose.Types.ObjectId();
      const mockSlipId = new mongoose.Types.ObjectId();
      mockReq.user = { userId: mockUserId.toString(), role: 'DELIVERY_PERSON' };

      const validReceiptText = `
        62
        Sales Receipt
        Basilico
        16/10/2026
        00:13
        DELIVERY
        Items: 1
        Margherita Basilico £15.70
      `;

      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: validReceiptText,
        confidence: 95,
      });

      const mockSaved = {
        _id: new mongoose.Types.ObjectId(),
        orderId: 'ORD-AUTO-DELIV',
        deliveryPersonId: mockUserId,
        receiptNo: '62',
        receiptDate: '2026-10-16',
        receiptTime: '00:13',
        status: 'DELIVERED',
        slipFileId: mockSlipId.toString(),
      };
      vi.mocked(gridfsService.uploadSlip).mockResolvedValueOnce(mockSlipId as any);
      vi.mocked(Delivery.create).mockResolvedValueOnce(mockSaved as any);

      await createDeliveryProof(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          receiptNo: '62',
          receiptDate: '2026-10-16',
          receiptTime: '00:13',
        })
      );
    });

    it('returns 422 with COLLECTION_REJECTED when receipt order type is COLLECTION', async () => {
      delete mockReq.body.receiptNo;

      const collectionText = `
        62
        Sales Receipt
        Basilico
        16/10/2026
        00:13
        COLLECTION
        Items: 1
      `;

      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: collectionText,
        confidence: 92,
      });

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
    });

    it('returns 422 with WEB_ORDER_INSUFFICIENT when receipt contains WEB ORDER without DELIVERY', async () => {
      delete mockReq.body.receiptNo;

      const webOrderText = `
        62
        Sales Receipt
        Basilico
        16/10/2026
        00:13
        Web Order
        Items: 1
      `;

      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: webOrderText,
        confidence: 90,
      });

      await createDeliveryProof(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'WEB_ORDER_INSUFFICIENT',
          message: expect.stringContaining("Found 'WEB ORDER', which alone is not proof of delivery"),
        })
      );
      expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
    });

    it('returns 422 with ORDER_TYPE_AMBIGUOUS when order-type label is partial (DELIVER)', async () => {
      delete mockReq.body.receiptNo;

      const partialDeliverText = `
        62
        Sales Receipt
        Basilico
        16/10/2026
        00:13
        DELIVER
        Items: 1
      `;

      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: partialDeliverText,
        confidence: 90,
      });

      await createDeliveryProof(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'ORDER_TYPE_AMBIGUOUS',
          message: expect.stringContaining("Partial match 'DELIVER' detected"),
        })
      );
      expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
    });

    it('returns 422 with DATE_UNREADABLE when target date region is unreadable and dates in notes are ignored', async () => {
      delete mockReq.body.receiptNo;

      const unreadableDateText = `
        62
        Sales Receipt
        Basilico
        00:13
        DELIVERY
        Items: 1
        Notes: Delivered on 25/12/2026
      `;

      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: unreadableDateText,
        confidence: 90,
      });

      await createDeliveryProof(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'DATE_UNREADABLE',
        })
      );
      expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
    });
  });

  describe('Fixed-Template OCR Upload Workflow Integration', () => {
    it('successfully processes, uploads to GridFS once, and creates Delivery with extracted receiptNo, receiptDate, receiptTime, and orderType', async () => {
      delete mockReq.body.receiptNo;
      const mockUserId = new mongoose.Types.ObjectId();
      const mockGridFsId = new mongoose.Types.ObjectId();
      mockReq.user = { userId: mockUserId.toString(), role: 'DELIVERY_PERSON' };

      const validSlipText = `
        62
        Sales Receipt
        Basilico
        16/10/2026
        00:13
        DELIVERY
        Items: 1
      `;

      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: validSlipText,
        confidence: 96,
      });

      vi.mocked(gridfsService.uploadSlip).mockResolvedValueOnce(mockGridFsId as any);

      const createdDeliveryDoc = {
        _id: new mongoose.Types.ObjectId(),
        receiptNo: '62',
        receiptDate: '2026-10-16',
        receiptTime: '00:13',
        orderType: 'DELIVERY',
        recipientName: 'Standard Recipient',
        deliveryPersonId: mockUserId,
        deliveryDate: '2026-10-16',
        uploadedAt: new Date(),
        slipFileId: mockGridFsId,
        status: 'DELIVERED',
      };
      vi.mocked(Delivery.create).mockResolvedValueOnce(createdDeliveryDoc as any);

      await createDeliveryProof(mockReq, mockRes);

      // 1. GridFS uploaded exactly once
      expect(gridfsService.uploadSlip).toHaveBeenCalledTimes(1);

      // 2. Delivery created with extracted fields
      expect(Delivery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          receiptNo: '62',
          receiptDate: '2026-10-16',
          receiptTime: '00:13',
          orderType: 'DELIVERY',
          slipFileId: mockGridFsId,
          status: 'DELIVERED',
        })
      );

      // 3. Structured extracted values returned to frontend with 201 Created
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          receiptNo: '62',
          receiptDate: '2026-10-16',
          receiptTime: '00:13',
          orderType: 'DELIVERY',
          slipFileId: mockGridFsId.toString(),
          ocr: expect.objectContaining({
            extractedReceiptNo: '62',
            printedDeliveryDate: '2026-10-16',
            printedDeliveryTime: '00:13',
            orderType: 'DELIVERY',
            isVerified: true,
          }),
          delivery: expect.objectContaining({
            receiptNo: '62',
            receiptDate: '2026-10-16',
            receiptTime: '00:13',
            orderType: 'DELIVERY',
            slipFileId: mockGridFsId.toString(),
          }),
        })
      );
    });

    it('rejects upload when receipt number is missing above Sales Receipt and does not store in GridFS', async () => {
      delete mockReq.body.receiptNo;

      const missingReceiptNoText = `
        Sales Receipt
        Basilico
        16/10/2026
        00:13
        DELIVERY
      `;

      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: missingReceiptNoText,
        confidence: 90,
      });

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
    });

    it('rejects upload when printed time is unreadable and does not store in GridFS', async () => {
      delete mockReq.body.receiptNo;

      const missingTimeText = `
        62
        Sales Receipt
        Basilico
        16/10/2026
        DELIVERY
      `;

      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: missingTimeText,
        confidence: 90,
      });

      await createDeliveryProof(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'TIME_UNREADABLE',
        })
      );
      expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
      expect(Delivery.create).not.toHaveBeenCalled();
    });

    it('rejects duplicate image SHA-256 before GridFS upload or Delivery creation', async () => {
      delete mockReq.body.receiptNo;

      const validSlipText = `
        62
        Sales Receipt
        Basilico
        16/10/2026
        00:13
        DELIVERY
      `;

      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: validSlipText,
        confidence: 95,
      });

      // Existing image found in AcceptedReceipt
      vi.mocked(AcceptedReceipt.findOne).mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        imageSha256: 'mock-sha',
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
      expect(Delivery.create).not.toHaveBeenCalled();
    });

    it('cleans up uploaded GridFS file if Delivery creation fails, leaving no orphaned files', async () => {
      delete mockReq.body.receiptNo;
      const mockUserId = new mongoose.Types.ObjectId();
      const mockGridFsId = new mongoose.Types.ObjectId();
      mockReq.user = { userId: mockUserId.toString(), role: 'DELIVERY_PERSON' };

      const validSlipText = `
        62
        Sales Receipt
        Basilico
        16/10/2026
        00:13
        DELIVERY
      `;

      vi.mocked(ocrService.extractTextFromSlip).mockResolvedValueOnce({
        text: validSlipText,
        confidence: 95,
      });

      vi.mocked(gridfsService.uploadSlip).mockResolvedValueOnce(mockGridFsId as any);
      vi.mocked(Delivery.create).mockRejectedValueOnce(new Error('Mongo connection drop'));

      await createDeliveryProof(mockReq, mockRes);

      // Cleaned up the file that was uploaded to GridFS
      expect(gridfsService.deleteSlip).toHaveBeenCalledWith(mockGridFsId.toString());
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});

