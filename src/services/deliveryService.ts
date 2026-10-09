import apiClient from './api';
import {
  DeliveryRecord,
  DailyStat,
  StorageStats,
  NewDeliveryInput,
  DeliveryPersonStat,
} from '../types/delivery';
import { INITIAL_DELIVERIES, INITIAL_DAILY_STATS, INITIAL_STORAGE_STATS } from '../utils/mockData';

export const deliveryService = {
  // Submit new delivery proof (Delivery Person)
  createDelivery: async (input: NewDeliveryInput): Promise<DeliveryRecord> => {
    try {
      const formData = new FormData();
      formData.append('receiptNo', input.receiptNo);
      formData.append('recipientName', input.customer);
      formData.append('customerName', input.customer);

      if (input.slipFile) {
        formData.append('slip', input.slipFile);
        formData.append('slipImage', input.slipFile);
      } else if (input.slipPreviewUrl) {
        formData.append('slipImageUrl', input.slipPreviewUrl);
      }

      const res = await apiClient.post<{ delivery: any }>('/deliveries', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const d = res.data.delivery;
      return {
        id: d.id || d._id,
        receiptNo: d.receiptNo,
        customer: d.recipientName || input.customer,
        recipientName: d.recipientName || input.customer,
        deliveryPerson: 'Bhushan Lokhande (You)',
        deliveryPersonId: d.deliveryPersonId,
        deliveryDate: d.deliveryDate,
        uploadedTime: new Date(d.uploadedAt).toLocaleTimeString('en-GB'),
        uploadedAt: d.uploadedAt,
        status: d.status || 'DELIVERED',
        slipFileId: d.slipFileId,
        slipImageUrl: d.slipFileId ? `/api/delivery/slip/${d.slipFileId}` : '/img/img-01.jpg',
      };
    } catch {
      // In-memory fallback if backend is offline
      const fallbackRecord: DeliveryRecord = {
        id: `del-${Date.now()}`,
        receiptNo: input.receiptNo.replace(/^#/, ''),
        deliveryPerson: 'Bhushan Lokhande (You)',
        customer: input.customer,
        recipientName: input.customer,
        deliveryDate: '08 Oct 2026',
        uploadedTime: '12:00:00 IST',
        status: 'Completed',
        slipImageUrl: input.slipPreviewUrl || '/img/img-01.jpg',
      };
      return fallbackRecord;
    }
  },

  // Get deliveries for today
  getTodayDeliveries: async (): Promise<{ totalDeliveries: number; uploadedSlips: number; deliveries: DeliveryRecord[] }> => {
    try {
      const res = await apiClient.get('/delivery/today');
      return res.data;
    } catch {
      return {
        totalDeliveries: INITIAL_DELIVERIES.length,
        uploadedSlips: INITIAL_DELIVERIES.length,
        deliveries: INITIAL_DELIVERIES,
      };
    }
  },

  // Get all retained deliveries (Admin)
  getAllDeliveries: async (params?: { date?: string; search?: string }): Promise<DeliveryRecord[]> => {
    try {
      const res = await apiClient.get<{ deliveries: any[] }>('/admin/deliveries', { params });
      return res.data.deliveries.map((d) => ({
        id: d.id,
        receiptNo: d.receiptNo,
        customer: d.recipientName || 'Walk-in Customer',
        recipientName: d.recipientName,
        deliveryPerson: d.deliveryPersonName || 'Bhushan Lokhande (DP-01)',
        deliveryPersonId: d.deliveryPersonId,
        deliveryDate: d.deliveryDate,
        uploadedTime: d.uploadedAt ? new Date(d.uploadedAt).toLocaleTimeString('en-GB') : '12:00:00 IST',
        uploadedAt: d.uploadedAt,
        status: d.status || 'DELIVERED',
        slipFileId: d.slipFileId,
        slipImageUrl: d.slipImageUrl || (d.slipFileId ? `/api/delivery/slip/${d.slipFileId}` : '/img/img-01.jpg'),
      }));
    } catch {
      return INITIAL_DELIVERIES;
    }
  },

  // Get active delivery personnel with operational performance metrics (Admin)
  getDeliveryPersonsList: async (): Promise<DeliveryPersonStat[]> => {
    try {
      const res = await apiClient.get<{ agents: DeliveryPersonStat[] }>('/admin/delivery-persons');
      return res.data.agents;
    } catch {
      // Mock fallback if token not loaded yet
      return [
        {
          id: 'dp-01',
          name: 'Bhushan Lokhande (DP-01)',
          email: 'delivery@pizzadeliver.com',
          role: 'DELIVERY_PERSON',
          phone: '+91 9820022334',
          status: 'ACTIVE',
          totalDeliveries: 14,
          totalSlips: 14,
          todayDeliveries: 5,
          todaySlips: 5,
          lastDeliveryAt: new Date().toISOString(),
        },
        {
          id: 'dp-02',
          name: 'Suresh Patil (DP-02)',
          email: 'suresh@pizzadeliver.com',
          role: 'DELIVERY_PERSON',
          phone: '+91 9820033445',
          status: 'ACTIVE',
          totalDeliveries: 9,
          totalSlips: 9,
          todayDeliveries: 3,
          todaySlips: 3,
          lastDeliveryAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'dp-03',
          name: 'Vikram Singh (DP-03)',
          email: 'vikram@pizzadeliver.com',
          role: 'DELIVERY_PERSON',
          phone: '+91 9820044556',
          status: 'ACTIVE',
          totalDeliveries: 12,
          totalSlips: 12,
          todayDeliveries: 4,
          todaySlips: 4,
          lastDeliveryAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ];
    }
  },

  // Get daily calendar statistics
  getDailyStats: async (): Promise<DailyStat[]> => {
    return INITIAL_DAILY_STATS;
  },

  // Get 32-day retention stats
  getStorageStats: async (): Promise<StorageStats> => {
    try {
      const res = await apiClient.get('/delivery/storage-stats');
      return res.data;
    } catch {
      return INITIAL_STORAGE_STATS;
    }
  },

  // Trigger manual 32-day cleanup
  cleanupOlderThan32Days: async (): Promise<{ deletedCount: number }> => {
    try {
      const res = await apiClient.post('/delivery/cleanup');
      return res.data;
    } catch {
      return { deletedCount: 0 };
    }
  },

  // Get real-time system & user activity log (Admin)
  getActivities: async (): Promise<any[]> => {
    try {
      const res = await apiClient.get<{ activities: any[] }>('/admin/activities');
      return res.data.activities || [];
    } catch {
      return [];
    }
  },
};

export default deliveryService;
