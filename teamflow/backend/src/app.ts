import express from 'express';
import cors from 'cors';
import { env } from './config/index.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { requestLoggerMiddleware } from './middleware/requestLogger.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';
import { AppError } from './utils/errors.js';

export const createApp = () => {
  const app = express();

  // Basic security and parsing
  app.use(
    cors({
      origin: [env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'x-actor-id', 'x-request-id'],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Tracing and Observability Middlewares
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(authMiddleware);

  // Mount API
  app.use('/api', apiRouter);

  // 404 handler for undefined API routes
  app.use((req, _res, next) => {
    next(AppError.notFound(`Route '${req.method} ${req.originalUrl}' does not exist on this server`, 'BAD_REQUEST'));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
