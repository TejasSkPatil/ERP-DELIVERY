import cron from 'node-cron';
import { deliveryService } from '../services/deliveryService';
import env from '../config/env';

let isJobRunning = false;

/**
 * Executes the 32-day retention cleanup safely.
 * Uses an execution guard to prevent accidental duplicate or concurrent runs.
 */
export const runRetentionCleanup = async (source: string = 'cron'): Promise<number> => {
  if (isJobRunning) {
    console.log(`[RetentionJob] (${source}) Cleanup is already in progress, skipping duplicate execution.`);
    return 0;
  }

  isJobRunning = true;
  try {
    console.log(`[RetentionJob] (${source}) Running 32-day retention cleanup job (${env.TIMEZONE})...`);
    const deletedCount = await deliveryService.purgeOlderThan32Days();
    console.log(`[RetentionJob] (${source}) Purged ${deletedCount} records and GridFS images older than 32 days.`);
    return deletedCount;
  } catch (err: any) {
    console.error(`[RetentionJob] (${source}) Retention cleanup failed:`, err.message);
    return 0;
  } finally {
    isJobRunning = false;
  }
};

export const initRetentionJob = () => {
  // Scheduled daily cleanup at 00:00:00 (Asia/Kolkata or configured timezone)
  cron.schedule(
    '0 0 * * *',
    async () => {
      await runRetentionCleanup('daily-cron');
    },
    {
      timezone: env.TIMEZONE,
    }
  );

  console.log(`[node-cron] Scheduled automated 32-day cleanup daily at 00:00:00 (${env.TIMEZONE}).`);

  // Catch-up run on service startup/wakeup: if Render was idle/asleep during midnight,
  // execute cleanup shortly after startup once connections are established.
  setTimeout(async () => {
    try {
      await runRetentionCleanup('startup-catchup');
    } catch (err: any) {
      console.warn('[RetentionJob] Startup catch-up cleanup warning:', err.message);
    }
  }, 5000);
};

export default initRetentionJob;
