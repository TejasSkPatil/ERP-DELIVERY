import cron from 'node-cron';
import { Delivery } from '../models/Delivery';
import { InMemoryStore } from '../config/db';
import { get32DayCutoffDate } from '../utils/timeZone';

export const initCleanupScheduler = () => {
  // Midnight every day in Asia/Kolkata timezone (00:00:00)
  cron.schedule(
    '0 0 * * *',
    async () => {
      console.log('[node-cron] Running automated 32-day MongoDB retention cleanup (Asia/Kolkata)...');
      try {
        const cutoffDate = get32DayCutoffDate();

        if (InMemoryStore.isUsingInMemory) {
          const toDelete = InMemoryStore.deliveries.filter(
            (d) => new Date(d.uploadedTimestamp) < cutoffDate
          );
          InMemoryStore.deliveries = InMemoryStore.deliveries.filter(
            (d) => new Date(d.uploadedTimestamp) >= cutoffDate
          );
          console.log(`[node-cron] Purged ${toDelete.length} expired delivery proof records & embedded images from memory.`);
        } else {
          const result = await Delivery.deleteMany({ uploadedTimestamp: { $lt: cutoffDate } });
          console.log(`[node-cron] Purged ${result.deletedCount} expired delivery records & embedded proof images from MongoDB.`);
        }
      } catch (err: any) {
        console.error('[node-cron] Error during automated 32-day retention cleanup:', err?.message);
      }
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  console.log('[node-cron] Scheduled nightly 32-day retention cleanup job for timezone Asia/Kolkata (00:00:00).');
};
