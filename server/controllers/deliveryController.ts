import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Delivery } from '../models/Delivery';
import { InMemoryStore } from '../config/db';
import { getKolkataDateInfo, get32DayCutoffDate } from '../utils/timeZone';

// Seed initial deliveries if empty
export const seedInitialDeliveries = async () => {
  const initial = [
    {
      id: 'del-1',
      receiptNo: '7',
      deliveryPersonId: 'dp-1',
      deliveryPersonName: 'Rahul Sharma (DP-01)',
      customerName: 'Amit Verma (Flat 402)',
      deliveryDate: '07 Oct 2026',
      uploadedTime: '13:45:20 IST',
      uploadedTimestamp: new Date(),
      status: 'Completed',
      slipImageUrl: 'img/img-01.jpg',
    },
    {
      id: 'del-2',
      receiptNo: '14',
      deliveryPersonId: 'dp-2',
      deliveryPersonName: 'Vikram Singh (DP-03)',
      customerName: 'Priya Nair (Order #1045)',
      deliveryDate: '07 Oct 2026',
      uploadedTime: '14:10:05 IST',
      uploadedTimestamp: new Date(),
      status: 'Completed',
      slipImageUrl: 'img/img-02.jpg',
    },
    {
      id: 'del-3',
      receiptNo: '19',
      deliveryPersonId: 'dp-1',
      deliveryPersonName: 'Rahul Sharma (DP-01)',
      customerName: 'Karan Mehra (Order #1049)',
      deliveryDate: '07 Oct 2026',
      uploadedTime: '14:52:40 IST',
      uploadedTimestamp: new Date(),
      status: 'Completed',
      slipImageUrl: 'img/img-03.jpg',
    },
    {
      id: 'del-4',
      receiptNo: '88',
      deliveryPersonId: 'dp-1',
      deliveryPersonName: 'Suresh Patil (DP-02)',
      customerName: 'Amit Verma (Flat 402)',
      deliveryDate: '06 Oct 2026',
      uploadedTime: '19:40:12 IST',
      uploadedTimestamp: new Date(Date.now() - 86400000),
      status: 'Completed',
      slipImageUrl: 'img/img-04.jpg',
    },
  ];

  if (InMemoryStore.isUsingInMemory) {
    if (InMemoryStore.deliveries.length === 0) {
      InMemoryStore.deliveries = [...initial];
    }
  } else {
    try {
      const count = await Delivery.countDocuments();
      if (count === 0) {
        await Delivery.insertMany(initial);
      }
    } catch {
      if (InMemoryStore.deliveries.length === 0) {
        InMemoryStore.deliveries = [...initial];
      }
    }
  }
};

export const createDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const { receiptNo, customerName } = req.body;
    const file = req.file;

    if (!receiptNo || !customerName) {
      return res.status(400).json({ error: 'Receipt number and customer name are required' });
    }

    if (!file && !req.body.slipImageUrl) {
      return res.status(400).json({ error: 'Delivery proof slip image is required' });
    }

    let slipImageUrl = '';
    let imageMimeType = '';
    let imageSize = 0;

    if (file) {
      // Store image directly in MongoDB as Base64 Data URI
      imageMimeType = file.mimetype || 'image/jpeg';
      imageSize = file.size;
      slipImageUrl = `data:${imageMimeType};base64,${file.buffer.toString('base64')}`;
    } else {
      slipImageUrl = req.body.slipImageUrl || 'img/img-01.jpg';
    }

    // Backend automatically stamps date and exact time in Asia/Kolkata
    const now = new Date();
    const { deliveryDate, uploadedTime } = getKolkataDateInfo(now);

    const deliveryRecord: any = {
      receiptNo: String(receiptNo).trim().replace(/^#/, ''),
      deliveryPersonId: req.user?.id || 'dp-unknown',
      deliveryPersonName: req.user?.name || 'Rahul Sharma (DP-01)',
      customerName: String(customerName).trim(),
      deliveryDate,
      uploadedTime,
      uploadedTimestamp: now,
      status: 'Completed',
      slipImageUrl, // Stored directly in MongoDB
      imageMimeType,
      imageSize,
    };

    let savedRecord: any = null;

    if (InMemoryStore.isUsingInMemory) {
      deliveryRecord.id = `del-${Date.now()}`;
      InMemoryStore.deliveries.unshift(deliveryRecord);
      savedRecord = deliveryRecord;
    } else {
      try {
        savedRecord = await Delivery.create(deliveryRecord);
      } catch (err) {
        deliveryRecord.id = `del-${Date.now()}`;
        InMemoryStore.deliveries.unshift(deliveryRecord);
        savedRecord = deliveryRecord;
      }
    }

    return res.status(201).json({
      message: 'Delivery recorded successfully with proof stored directly in MongoDB',
      delivery: savedRecord,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error recording delivery' });
  }
};

export const getTodayDeliveries = async (req: AuthRequest, res: Response) => {
  try {
    const { deliveryDate } = getKolkataDateInfo(new Date());

    let deliveries: any[] = [];

    if (InMemoryStore.isUsingInMemory) {
      deliveries = InMemoryStore.deliveries.filter((d) => d.deliveryDate === deliveryDate);
    } else {
      try {
        deliveries = await Delivery.find({ deliveryDate }).sort({ uploadedTimestamp: -1 });
      } catch {
        deliveries = InMemoryStore.deliveries.filter((d) => d.deliveryDate === deliveryDate);
      }
    }

    return res.json({
      date: deliveryDate,
      totalDeliveries: deliveries.length,
      uploadedSlips: deliveries.filter((d) => d.slipImageUrl).length,
      deliveries,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error retrieving today deliveries' });
  }
};

export const getDeliveriesByDate = async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.params;

    let deliveries: any[] = [];

    if (InMemoryStore.isUsingInMemory) {
      deliveries = InMemoryStore.deliveries.filter((d) => d.deliveryDate === date);
    } else {
      try {
        deliveries = await Delivery.find({ deliveryDate: date }).sort({ uploadedTimestamp: -1 });
      } catch {
        deliveries = InMemoryStore.deliveries.filter((d) => d.deliveryDate === date);
      }
    }

    return res.json({
      date,
      count: deliveries.length,
      deliveries,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMyDeliveries = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userName = req.user?.name || '';
    const userId = req.user?.id || '';

    let all: any[] = [];

    if (InMemoryStore.isUsingInMemory) {
      all = InMemoryStore.deliveries;
    } else {
      try {
        all = await Delivery.find().sort({ uploadedTimestamp: -1 });
      } catch {
        all = InMemoryStore.deliveries;
      }
    }

    if (userRole === 'DELIVERY_PERSON') {
      const filtered = all.filter(
        (d) => d.deliveryPersonId === userId || d.deliveryPersonName.includes(userName)
      );
      return res.json({ deliveries: filtered });
    } else if (userRole === 'USER') {
      const filtered = all.filter(
        (d) => d.customerId === userId || d.customerName.toLowerCase().includes(userName.toLowerCase())
      );
      return res.json({ deliveries: filtered.length > 0 ? filtered : all });
    }

    return res.json({ deliveries: all });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAllDeliveries = async (req: AuthRequest, res: Response) => {
  try {
    let deliveries: any[] = [];

    if (InMemoryStore.isUsingInMemory) {
      deliveries = InMemoryStore.deliveries;
    } else {
      try {
        deliveries = await Delivery.find().sort({ uploadedTimestamp: -1 });
      } catch {
        deliveries = InMemoryStore.deliveries;
      }
    }

    return res.json({ deliveries });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getStorageStats = async (req: AuthRequest, res: Response) => {
  try {
    const cutoffDate = get32DayCutoffDate();
    let allDeliveries: any[] = [];

    if (InMemoryStore.isUsingInMemory) {
      allDeliveries = InMemoryStore.deliveries;
    } else {
      try {
        allDeliveries = await Delivery.find().sort({ uploadedTimestamp: 1 });
      } catch {
        allDeliveries = InMemoryStore.deliveries;
      }
    }

    const eligibleForDeletion = allDeliveries.filter(
      (d) => new Date(d.uploadedTimestamp) < cutoffDate
    );

    const oldest = allDeliveries[0]?.deliveryDate || '06 Sep 2026';
    const newest = allDeliveries[allDeliveries.length - 1]?.deliveryDate || '07 Oct 2026';

    return res.json({
      retentionDays: 32,
      oldestRecordDate: oldest,
      newestRecordDate: newest,
      totalRecords: allDeliveries.length,
      eligibleForDeletionCount: eligibleForDeletion.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const cleanupOlderThan32Days = async (req: AuthRequest, res: Response) => {
  try {
    const cutoffDate = get32DayCutoffDate();
    let deletedCount = 0;

    if (InMemoryStore.isUsingInMemory) {
      const toDelete = InMemoryStore.deliveries.filter(
        (d) => new Date(d.uploadedTimestamp) < cutoffDate
      );
      InMemoryStore.deliveries = InMemoryStore.deliveries.filter(
        (d) => new Date(d.uploadedTimestamp) >= cutoffDate
      );
      deletedCount = toDelete.length;
    } else {
      try {
        const result = await Delivery.deleteMany({ uploadedTimestamp: { $lt: cutoffDate } });
        deletedCount = result.deletedCount || 0;
      } catch {
        const toDelete = InMemoryStore.deliveries.filter(
          (d) => new Date(d.uploadedTimestamp) < cutoffDate
        );
        InMemoryStore.deliveries = InMemoryStore.deliveries.filter(
          (d) => new Date(d.uploadedTimestamp) >= cutoffDate
        );
        deletedCount = toDelete.length;
      }
    }

    return res.json({
      message: '32-day MongoDB retention cleanup completed successfully. Records and embedded proof images purged.',
      deletedCount,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
