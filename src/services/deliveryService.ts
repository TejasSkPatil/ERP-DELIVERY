import apiClient from './api';
import { DeliveryRecord, DailyStat, StorageStats, NewDeliveryInput } from '../types/delivery';
import { INITIAL_DELIVERIES, INITIAL_DAILY_STATS, INITIAL_STORAGE_STATS } from '../utils/mockData';

export const deliveryService = {
  // Submit new delivery proof
  createDelivery: async (input: NewDeliveryInput): Promise<DeliveryRecord> => {
    try {
      const formData = new FormData();
      formData.append('receiptNo', input.receiptNo);
      formData.append('customerName', input.customer);

      if (input.slipFile) {
        formData.append('slipImage', input.slipFile);
      } else if (input.slipPreviewUrl) {
        formData.append('slipImageUrl', input.slipPreviewUrl);
      }

      const res = await apiClient.post<{ delivery: DeliveryRecord }>('/delivery/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.delivery;
    } catch {
      // In-memory fallback if backend is not yet attached
      const fallbackRecord: DeliveryRecord = {
        id: `del-${Date.now()}`,
        receiptNo: input.receiptNo.replace(/^#/, ''),
        deliveryPerson: 'Rahul Sharma (You)',
        customer: input.customer,
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

  // Get deliveries by calendar date
  getDeliveriesByDate: async (date: string): Promise<DeliveryRecord[]> => {
    try {
      const res = await apiClient.get(`/delivery/date/${encodeURIComponent(date)}`);
      return res.data.deliveries;
    } catch {
      return INITIAL_DELIVERIES.filter((d) => d.deliveryDate === date);
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
};

export default deliveryService;
