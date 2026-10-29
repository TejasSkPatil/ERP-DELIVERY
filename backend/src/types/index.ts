import { Request } from 'express';
import 'multer';
import { TokenPayload } from './user';

export * from './user';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  file?: Express.Multer.File;
}

export interface HealthResponse {
  success: boolean;
  message: string;
}
