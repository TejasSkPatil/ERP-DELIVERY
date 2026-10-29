import apiClient from './api';
import {
  DeliveryRecord,
  DailyStat,
  StorageStats,
  NewDeliveryInput,
  DeliveryPersonStat,
} from '../types/delivery';
import { INITIAL_DELIVERIES, INITIAL_DAILY_STATS, INITIAL_STORAGE_STATS } from '../utils/mockData';
import { formatDisplayDate } from '../utils/timeZone';

export const deliveryService = {
  // Submit new delivery proof (Delivery Person)
  createDelivery: async (input: NewDeliveryInput): Promise<DeliveryRecord> => {
    try {
      const formData = new FormData();
      if (input.receiptNo && input.receiptNo.trim()) {
        formData.append('receiptNo', input.receiptNo.trim());
      }
      if (input.customer && input.customer.trim()) {
        formData.append('recipientName', input.customer.trim());
        formData.append('customerName', input.customer.trim());
      }

      if (input.slipFile) {
        formData.append('slip', input.slipFile);
        formData.append('slipImage', input.slipFile);
      } else if (input.slipPreviewUrl) {
        formData.append('slipImageUrl', input.slipPreviewUrl);
      }

      const res = await apiClient.post<{ delivery?: any; receiptNo?: string; receiptDate?: string; receiptTime?: string; orderType?: string; slipFileId?: string; ocr?: any }>('/deliveries', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const d = res.data.delivery || res.data;
      return {
        id: d.id || d._id || `del-${Date.now()}`,
        receiptNo: d.receiptNo || res.data.receiptNo || '',
        customer: d.recipientName || input.customer || 'Standard Recipient',
        recipientName: d.recipientName || input.customer || 'Standard Recipient',
        deliveryPerson: 'Bhushan Lokhande (You)',
        deliveryPersonId: d.deliveryPersonId,
        deliveryDate: d.deliveryDate,
        receiptDate: formatDisplayDate(d.receiptDate || res.data.receiptDate || d.deliveryDate),
        receiptTime: d.receiptTime || res.data.receiptTime || '',
        orderType: d.orderType || res.data.orderType || res.data.ocr?.orderType || 'DELIVERY',
        uploadedTime: d.uploadedAt ? new Date(d.uploadedAt).toLocaleTimeString('en-GB') : new Date().toLocaleTimeString('en-GB'),
        uploadedAt: d.uploadedAt || new Date().toISOString(),
        status: d.status || 'DELIVERED',
        slipFileId: d.slipFileId || res.data.slipFileId,
        slipImageUrl: (d.slipFileId || res.data.slipFileId) ? `/api/delivery/slip/${d.slipFileId || res.data.slipFileId}` : (input.slipPreviewUrl || '/img/img-01.jpg'),
      };
    } catch (err: any) {
      if (err?.response?.data) {
        const errorMsg = err.response.data.message || err.response.data.error;
        if (errorMsg) {
          const apiErr: any = new Error(errorMsg);
          apiErr.code = err.response.data.code;
          apiErr.ocr = err.response.data.ocr;
          throw apiErr;
        }
      }
      if (err?.message && !err?.response) {
        throw new Error('Backend server is not reachable. Please start the backend server with `npm run dev` or `npm run dev:backend`.');
      }
      throw err;
    }
  },

  // Get deliveries for today
  getTodayDeliveries: async (): Promise<{ totalDeliveries: number; uploadedSlips: number; deliveries: DeliveryRecord[] }> => {
    try {
      const res = await apiClient.get<{ totalDeliveries?: number; uploadedSlips?: number; deliveries?: any[] }>('/delivery/today');
      const rawDeliveries = res.data.deliveries || [];
      const mappedDeliveries: DeliveryRecord[] = rawDeliveries.map((d: any) => ({
        id: d.id || d._id?.toString() || `del-${Date.now()}`,
        receiptNo: d.receiptNo,
        customer: d.recipientName || 'Standard Recipient',
        recipientName: d.recipientName || 'Standard Recipient',
        deliveryPerson: 'Bhushan Lokhande (You)',
        deliveryPersonId: d.deliveryPersonId,
        deliveryDate: d.deliveryDate,
        receiptDate: formatDisplayDate(d.receiptDate || d.deliveryDate),
        receiptTime: d.receiptTime || '',
        orderType: d.orderType || 'DELIVERY',
        uploadedTime: d.uploadedAt ? new Date(d.uploadedAt).toLocaleTimeString('en-GB') : '',
        uploadedAt: d.uploadedAt,
        status: d.status || 'DELIVERED',
        slipFileId: d.slipFileId?.toString(),
        slipImageUrl: d.slipFileId ? `/api/delivery/slip/${d.slipFileId}` : (d.slipImageUrl || '/img/img-01.jpg'),
      }));

      return {
        totalDeliveries: res.data.totalDeliveries ?? mappedDeliveries.length,
        uploadedSlips: res.data.uploadedSlips ?? mappedDeliveries.filter((d) => d.slipFileId).length,
        deliveries: mappedDeliveries,
      };
    } catch {
      return {
        totalDeliveries: INITIAL_DELIVERIES.length,
        uploadedSlips: INITIAL_DELIVERIES.length,
        deliveries: INITIAL_DELIVERIES,
      };
    }
  },

  // Alias for backward-compatibility with other dashboard views
  getMyDeliveries: async (): Promise<{ totalDeliveries: number; uploadedSlips: number; deliveries: DeliveryRecord[] }> => {
    return deliveryService.getTodayDeliveries();
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
        receiptDate: formatDisplayDate(d.receiptDate || d.deliveryDate),
        receiptTime: d.receiptTime || '',
        orderType: d.orderType || 'DELIVERY',
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
