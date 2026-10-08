import { startServer } from './backend/src/server';

startServer().catch((err) => {
  console.error('[ERP-DELIVERY] Startup error:', err);
  process.exit(1);
});
