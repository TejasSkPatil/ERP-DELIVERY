import connectDatabase from '../config/database';
import { runRetentionCleanup } from './retentionJob';

async function main() {
  console.log('[Render Cron] Connecting to database for manual retention cleanup...');
  await connectDatabase();
  const count = await runRetentionCleanup('render-cron-script');
  console.log(`[Render Cron] Completed retention cleanup. Removed: ${count} expired records.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[Render Cron] Retention cleanup failed:', err);
  process.exit(1);
});
