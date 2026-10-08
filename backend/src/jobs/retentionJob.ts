import cron from 'node-cron';
import { deliveryService } from '../services/deliveryService';
import env from '../config/env';

export const initRetentionJob = () => {
  cron.schedule(
    '0 0 * * *',
    async () => {
      console.log(`[node-cron] Running daily 32-day retention cleanup job (${env.TIMEZONE})...`);
      try {
        const deletedCount = await deliveryService.purgeOlderThan32Days();
        console.log(`[node-cron] Purged ${deletedCount} records and GridFS images older than 32 days.`);
      } catch (err: any) {
        console.error('[node-cron] Retention cleanup job failed:', err.message);
      }
    },
    {
      timezone: env.TIMEZONE,
    }
  );

  console.log(`[node-cron] Scheduled automated 32-day cleanup daily at 00:00:00 (${env.TIMEZONE}).`);
};

export default initRetentionJob;
