import { Request } from 'express';
import { UserRole, TokenPayload } from './user';

export * from './user';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export interface HealthResponse {
  success: boolean;
  message: string;
}
