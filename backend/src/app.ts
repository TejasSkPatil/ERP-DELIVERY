import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes';
import errorHandler from './middleware/errorHandler';

export const createApp = (): Application => {
  const app = express();

  // Security headers with relaxed CSP for template fonts and assets
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Cross-Origin Resource Sharing
  app.use(cors());

  // Body parsers
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Direct health check route as specified
  app.get('/api/health', (_req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      message: 'ERP Delivery API running',
    });
  });

  // Mount API routers
  app.use('/api', apiRoutes);

  // Error handling middleware
  app.use(errorHandler);

  return app;
};

export default createApp;
