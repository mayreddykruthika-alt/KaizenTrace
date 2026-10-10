import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id: string;
      actor?: {
        id: string;
        name: string;
        email: string;
        role: 'admin' | 'project_manager' | 'member' | 'viewer';
      };
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incomingId = req.headers['x-request-id'];
  const requestId = (typeof incomingId === 'string' && incomingId.trim()) ? incomingId : uuidv4();
  
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
