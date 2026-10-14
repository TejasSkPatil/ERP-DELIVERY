import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import createApp from './app';
import env from './config/env';
import connectDatabase from './config/database';
import initRetentionJob from './jobs/retentionJob';
import seedDatabaseIfEmpty from './utils/seeder';
import { backfillHistoricalReceipts } from './services/receiptRegistry.service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

export async function startServer() {
  const app = createApp();
  // Ensure server listens on process.env.PORT (required for Render) and binds to 0.0.0.0
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (Number(env.PORT) || 3001);
  const HOST = '0.0.0.0';

  // Static assets from public folder if present
  const publicPath = path.join(projectRoot, 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  // Connect database & seed initial records
  await connectDatabase();
  await seedDatabaseIfEmpty();
  await backfillHistoricalReceipts();

  // Initialize background 32-day retention cron job
  initRetentionJob();

  // Standalone backend mode detection:
  // Render automatically sets process.env.RENDER='true'.
  // Also checks explicit STANDALONE_BACKEND flag.
  const isProduction = env.NODE_ENV === 'production';
  const isStandaloneBackend =
    process.env.STANDALONE_BACKEND === 'true' || process.env.RENDER === 'true';

  if (!isStandaloneBackend) {
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
      if (fs.existsSync(path.join(distPath, 'index.html'))) {
        app.use(express.static(distPath));
        app.get('*', (_req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      } else {
        console.log(
          '[ERP-DELIVERY Backend] Frontend dist directory not found; operating in standalone API mode.'
        );
      }
    }
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(
      `[ERP-DELIVERY Backend] Server listening at http://${HOST}:${PORT}${
        isStandaloneBackend ? ' (Standalone API Mode)' : ''
      }`
    );
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
