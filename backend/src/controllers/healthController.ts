import { Request, Response } from 'express';
import { HealthResponse } from '../types';

export const getHealth = (_req: Request, res: Response<HealthResponse>) => {
  return res.status(200).json({
    success: true,
    message: 'ERP Delivery API running',
  });
};

export default { getHealth };
