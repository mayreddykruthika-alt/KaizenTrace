import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../logger/index.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const requestId = req.id || 'unknown';

  // 1. Handled AppError
  if (err instanceof AppError) {
    logger.warn({
      requestId,
      errorCode: err.errorCode,
      statusCode: err.statusCode,
      message: err.message,
      details: err.details,
      path: req.originalUrl,
    }, 'Handled application error');

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details,
      },
      requestId,
    });
    return;
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      rule: e.code,
    }));

    logger.warn({
      requestId,
      errorCode: 'VALIDATION_ERROR',
      validationErrors: formattedErrors,
      path: req.originalUrl,
    }, 'Request validation failed');

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed',
        details: formattedErrors,
      },
      requestId,
    });
    return;
  }

  // 3. Mongoose CastError (e.g. invalid ObjectId)
  if ((err as any).name === 'CastError') {
    logger.warn({
      requestId,
      errorCode: 'BAD_REQUEST',
      path: (err as any).path,
      value: (err as any).value,
    }, 'Mongoose CastError (invalid entity ID format)');

    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: `Invalid format for parameter '${(err as any).path}'`,
      },
      requestId,
    });
    return;
  }

  // 4. Mongoose Duplicate Key Error (E11000)
  if ((err as any).code === 11000) {
    const keys = Object.keys((err as any).keyPattern || {});
    logger.warn({
      requestId,
      errorCode: 'CONFLICT',
      keys,
    }, 'MongoDB duplicate key conflict');

    res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `A record with this ${keys.join(', ') || 'field'} already exists`,
      },
      requestId,
    });
    return;
  }

  // 5. Unhandled internal error
  logger.error({
    requestId,
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  }, 'Unhandled internal server error');

  res.status(500).json({
    success: false,
    error: {
      code: 'DATABASE_ERROR',
      message: 'An unexpected internal error occurred. Please try again later.',
    },
    requestId,
  });
};
