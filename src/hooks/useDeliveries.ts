import { useState, useEffect, useCallback } from 'react';
import { DeliveryRecord, DailyStat, StorageStats, NewDeliveryInput } from '../types/delivery';
import { deliveryService } from '../services/deliveryService';
import { INITIAL_DELIVERIES, INITIAL_DAILY_STATS, INITIAL_STORAGE_STATS } from '../utils/mockData';

export const useDeliveries = () => {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>(INITIAL_DELIVERIES);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>(INITIAL_DAILY_STATS);
  const [storageStats, setStorageStats] = useState<StorageStats>(INITIAL_STORAGE_STATS);
  const [selectedDate, setSelectedDate] = useState<string>('08 Oct 2026');
  const [selectedSlip, setSelectedSlip] = useState<DeliveryRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const todayRes = await deliveryService.getTodayDeliveries();
      const stats = await deliveryService.getDailyStats();
      const storage = await deliveryService.getStorageStats();

      setDeliveries(todayRes.deliveries);
      setDailyStats(stats);
      setStorageStats(storage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addDelivery = useCallback(async (input: NewDeliveryInput): Promise<DeliveryRecord> => {
    setIsLoading(true);
    try {
      const newRecord = await deliveryService.createDelivery(input);
      setDeliveries((prev) => [newRecord, ...prev]);

      // Update today's stat counter
      setDailyStats((prev) =>
        prev.map((s) =>
          s.isToday
            ? { ...s, totalDeliveries: s.totalDeliveries + 1, uploadedSlips: s.uploadedSlips + 1 }
            : s
        )
      );

      return newRecord;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const triggerCleanup = useCallback(async () => {
    await deliveryService.cleanupOlderThan32Days();
    setStorageStats((prev) => ({ ...prev, eligibleForDeletionCount: 0 }));
  }, []);

  return {
    deliveries,
    dailyStats,
    storageStats,
    selectedDate,
    setSelectedDate,
    selectedSlip,
    setSelectedSlip,
    isLoading,
    addDelivery,
    triggerCleanup,
    refreshDeliveries: fetchAll,
  };
};

export default useDeliveries;
