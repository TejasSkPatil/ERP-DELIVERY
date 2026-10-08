import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import createApp from './app';
import env from './config/env';
import connectDatabase from './config/database';
import initRetentionJob from './jobs/retentionJob';
import seedDatabaseIfEmpty from './utils/seeder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

export async function startServer() {
  const app = createApp();
  const PORT = Number(env.PORT) || 3000;
  const HOST = '0.0.0.0';

  // Static assets from public folder
  app.use(express.static(path.join(projectRoot, 'public')));

  // Connect database & seed initial records
  await connectDatabase();
  await seedDatabaseIfEmpty();

  // Initialize background 32-day retention cron job
  initRetentionJob();

  // Vite development integration or static dist serving
  const isProduction = env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: projectRoot,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(projectRoot, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`[ERP-DELIVERY Backend] Server listening at http://${HOST}:${PORT}`);
  });

  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer().catch((err) => {
    console.error('[ERP-DELIVERY Backend] Failed to start:', err);
    process.exit(1);
  });
}

export default startServer;
