import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger/index.js';

export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = req.id;

  // Log incoming request
  logger.info({
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
  }, 'Incoming request started');

  // Hook into response finish event
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const actorId = req.actor?.id;
    const actorRole = req.actor?.role;

    const logPayload = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      durationMs,
      actorId,
      actorRole,
    };

    if (statusCode >= 500) {
      logger.error(logPayload, 'Request completed with server error');
    } else if (statusCode >= 400) {
      logger.warn(logPayload, 'Request completed with client error');
    } else {
      logger.info(logPayload, 'Request completed successfully');
    }
  });

  next();
};
