import type { Request, Response } from 'express';
import createApp from '../backend/src/app';
import connectDatabase from '../backend/src/config/database';
import seedDatabaseIfEmpty from '../backend/src/utils/seeder';

const app = createApp();
let isDatabaseReady = false;

export default async function handler(req: Request, res: Response) {
  if (!isDatabaseReady) {
    try {
      await connectDatabase();
      await seedDatabaseIfEmpty().catch((err) =>
        console.warn('[Vercel Serverless] Seeder note:', err)
      );
      isDatabaseReady = true;
    } catch (err: any) {
      console.error('[Vercel Serverless] DB connection error:', err?.message || err);
      return res.status(500).json({
        success: false,
        message: 'Database connection failed on serverless handler.',
        error: err?.message,
      });
    }
  }

  return app(req, res);
}
