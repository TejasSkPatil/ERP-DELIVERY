import type { Request, Response } from 'express';
import createApp from '../backend/src/app';
import connectDatabase from '../backend/src/config/database';
import seedDatabaseIfEmpty from '../backend/src/utils/seeder';

const app = createApp();
let isDatabaseReady = false;

export default async function handler(req: Request, res: Response) {
  // Restore rewritten URL if Vercel stripped the subpath
  const matchedPath =
    (req.headers['x-matched-path'] as string) ||
    (req.headers['x-forwarded-uri'] as string);
  if (matchedPath && req.url === '/api' && matchedPath !== '/api') {
    req.url = matchedPath;
  }

  if (!isDatabaseReady) {
    try {
      await connectDatabase();
      isDatabaseReady = true;
      // Asynchronously trigger seeder without blocking the request
      seedDatabaseIfEmpty().catch((err) =>
        console.warn('[Vercel Serverless] Seeder note:', err)
      );
    } catch (err: any) {
      console.error('[Vercel Serverless] DB connection error:', err?.message || err);
      return res.status(500).json({
        success: false,
        message: 'Database connection failed on serverless handler.',
        error: err?.message,
      });
    }
  }

  return new Promise<void>((resolve, reject) => {
    res.on('finish', () => resolve());
    res.on('close', () => resolve());
    res.on('error', (err) => reject(err));
    app(req, res, (err?: any) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

