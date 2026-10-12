import { describe, expect, it, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { deliveryService } from './deliveryService';
import { Delivery } from '../models/Delivery';
import { AcceptedReceipt } from '../models/AcceptedReceipt';
import { gridfsService } from './gridfsService';
import * as receiptRegistryService from './receiptRegistry.service';
import * as imageHashService from './image-hash.service';
import * as perceptualHashService from './perceptual-hash.service';
import { InMemoryDatabase } from '../config/database';

vi.mock('../models/Delivery');
vi.mock('../models/AcceptedReceipt');
vi.mock('./gridfsService');
vi.mock('./receiptRegistry.service');
vi.mock('./image-hash.service');
vi.mock('./perceptual-hash.service');

describe('deliveryService.create (Phase 6 Duplicate Protection Integration)', () => {
  const mockDeliveryPersonId = new mongoose.Types.ObjectId().toString();
  const mockBuffer = Buffer.from('test-image-slip-bytes');

  beforeEach(() => {
    vi.clearAllMocks();
    InMemoryDatabase.isUsingFallback = false;

    vi.mocked(receiptRegistryService.isReceiptRegistered).mockResolvedValue(false);
    vi.mocked(imageHashService.calculateImageSha256).mockReturnValue('mock-sha256-hex');
    vi.mocked(imageHashService.isImageDuplicate).mockResolvedValue(false);
    vi.mocked(perceptualHashService.calculatePerceptualHash).mockResolvedValue('mock-phash-hex');
    vi.mocked(perceptualHashService.checkPerceptualDuplicate).mockResolvedValue({
      hasLikelyMatch: false,
      matches: [],
      perceptualHash: 'mock-phash-hex',
    });
    vi.mocked(receiptRegistryService.registerReceipt).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      normalizedReceiptNo: 'REC-1001',
    } as any);
  });

  it('rejects creation if receipt number is invalid or empty', async () => {
    await expect(
      deliveryService.create({
        receiptNo: '   ',
        deliveryPersonId: mockDeliveryPersonId,
      })
    ).rejects.toThrow('A valid receipt number is required.');
  });

  it('rejects creation if receipt number is already registered in AcceptedReceipt', async () => {
    vi.mocked(receiptRegistryService.isReceiptRegistered).mockResolvedValueOnce(true);

    await expect(
      deliveryService.create({
        receiptNo: 'REC-1001',
        deliveryPersonId: mockDeliveryPersonId,
      })
    ).rejects.toThrow('This receipt has already been delivered.');
  });

  it('rejects creation if image SHA-256 hash is an exact duplicate', async () => {
    vi.mocked(imageHashService.isImageDuplicate).mockResolvedValueOnce(true);

    await expect(
      deliveryService.create({
        receiptNo: 'REC-1001',
        deliveryPersonId: mockDeliveryPersonId,
        fileBuffer: mockBuffer,
      })
    ).rejects.toThrow('This delivery slip image has already been uploaded and processed.');

    expect(receiptRegistryService.registerReceipt).not.toHaveBeenCalled();
    expect(gridfsService.uploadSlip).not.toHaveBeenCalled();
  });

  it('rolls back reservation if GridFS upload fails', async () => {
    const mockReceiptId = new mongoose.Types.ObjectId();
    vi.mocked(receiptRegistryService.registerReceipt).mockResolvedValueOnce({
      _id: mockReceiptId,
      normalizedReceiptNo: 'REC-1001',
    } as any);

    vi.mocked(gridfsService.uploadSlip).mockRejectedValueOnce(
      new Error('GridFS connection timeout')
    );

    await expect(
      deliveryService.create({
        receiptNo: 'REC-1001',
        deliveryPersonId: mockDeliveryPersonId,
        fileBuffer: mockBuffer,
      })
    ).rejects.toThrow('GridFS connection timeout');

    expect(AcceptedReceipt.deleteOne).toHaveBeenCalledWith({ _id: mockReceiptId });
    expect(Delivery.create).not.toHaveBeenCalled();
  });

  it('cleans up GridFS file and rolls back reservation if Delivery creation fails', async () => {
    const mockReceiptId = new mongoose.Types.ObjectId();
    const mockSlipId = new mongoose.Types.ObjectId();
    vi.mocked(receiptRegistryService.registerReceipt).mockResolvedValueOnce({
      _id: mockReceiptId,
      normalizedReceiptNo: 'REC-1001',
    } as any);
    vi.mocked(gridfsService.uploadSlip).mockResolvedValueOnce(mockSlipId as any);
    vi.mocked(Delivery.create).mockRejectedValueOnce(new Error('Mongo network error on Delivery.create'));

    await expect(
      deliveryService.create({
        receiptNo: 'REC-1001',
        deliveryPersonId: mockDeliveryPersonId,
        fileBuffer: mockBuffer,
      })
    ).rejects.toThrow('Mongo network error on Delivery.create');

    expect(AcceptedReceipt.deleteOne).toHaveBeenCalledWith({ _id: mockReceiptId });
    expect(gridfsService.deleteSlip).toHaveBeenCalledWith(mockSlipId.toString());
  });

  it('successfully creates Delivery and links to AcceptedReceipt reservation', async () => {
    const mockReceiptId = new mongoose.Types.ObjectId();
    const mockSlipId = new mongoose.Types.ObjectId();
    const mockDeliveryId = new mongoose.Types.ObjectId();

    vi.mocked(receiptRegistryService.registerReceipt).mockResolvedValueOnce({
      _id: mockReceiptId,
      normalizedReceiptNo: 'REC-1001',
    } as any);
    vi.mocked(gridfsService.uploadSlip).mockResolvedValueOnce(mockSlipId as any);
    vi.mocked(Delivery.create).mockResolvedValueOnce({
      _id: mockDeliveryId,
      receiptNo: 'REC-1001',
      status: 'DELIVERED',
      slipFileId: mockSlipId,
    } as any);

    const result = await deliveryService.create({
      receiptNo: '#rec-1001',
      deliveryPersonId: mockDeliveryPersonId,
      fileBuffer: mockBuffer,
    });

    expect(result).toBeDefined();
    expect(result._id).toEqual(mockDeliveryId);
    expect(AcceptedReceipt.updateOne).toHaveBeenCalledWith(
      { _id: mockReceiptId },
      expect.objectContaining({
        deliveryId: mockDeliveryId,
        slipFileId: mockSlipId,
      })
    );
  });

  describe('Phase 7: Retention compatibility (purgeOlderThan32Days)', () => {
    it('purges expired Deliveries and GridFS files after 32 days while keeping AcceptedReceipt permanent registry completely intact', async () => {
      const oldDeliveryId = new mongoose.Types.ObjectId();
      const oldSlipFileId = new mongoose.Types.ObjectId();

      const oldDeliveries = [
        {
          _id: oldDeliveryId,
          receiptNo: 'REC-HISTORIC-01',
          slipFileId: oldSlipFileId,
          uploadedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        },
      ];

      vi.mocked(Delivery.find).mockResolvedValueOnce(oldDeliveries as any);
      vi.mocked(Delivery.deleteMany).mockResolvedValueOnce({ deletedCount: 1 } as any);
      vi.mocked(gridfsService.deleteSlip).mockResolvedValueOnce(undefined as any);

      const deletedCount = await deliveryService.purgeOlderThan32Days();

      expect(deletedCount).toBe(1);
      // GridFS image file deleted per existing retention policy
      expect(gridfsService.deleteSlip).toHaveBeenCalledWith(oldSlipFileId);
      // Expired delivery records deleted per existing retention policy
      expect(Delivery.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          uploadedAt: expect.objectContaining({
            $lt: expect.any(Date),
          }),
        })
      );

      // CRITICAL Phase 7 requirement: Permanent AcceptedReceipt records must NOT be deleted!
      expect(AcceptedReceipt.deleteMany).not.toHaveBeenCalled();
      expect(AcceptedReceipt.deleteOne).not.toHaveBeenCalled();
    });

    it('handles purge gracefully in InMemoryDatabase fallback without clearing registry records', async () => {
      InMemoryDatabase.isUsingFallback = true;
      const recentDate = new Date();
      const expiredDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);

      InMemoryDatabase.deliveries = [
        { id: 'del-recent', receiptNo: 'REC-NEW', uploadedAt: recentDate },
        { id: 'del-expired', receiptNo: 'REC-OLD', uploadedAt: expiredDate },
      ] as any;

      const deletedCount = await deliveryService.purgeOlderThan32Days();

      expect(deletedCount).toBe(1);
      expect(InMemoryDatabase.deliveries).toHaveLength(1);
      expect(InMemoryDatabase.deliveries[0].id).toBe('del-recent');
    });
  });
});
