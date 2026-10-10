import mongoose from 'mongoose';
import { env } from './index.js';
import { logger } from '../logger/index.js';

let memoryServer: any = null;

export const connectDatabase = async (): Promise<void> => {
  try {
    let uri = env.MONGODB_URI;

    // Use in-memory MongoDB for tests or if specifically requested
    if (process.env.NODE_ENV === 'test' || uri === 'memory' || uri === 'in-memory') {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
      logger.info({ uri }, 'Using MongoMemoryServer for isolated database environment');
    }

    mongoose.set('strictQuery', true);
    
    // Connect to MongoDB
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    logger.info({
      dbName: mongoose.connection.name,
      host: mongoose.connection.host,
    }, 'Successfully connected to MongoDB');

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB runtime connection error');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost');
    });

  } catch (err: any) {
    logger.error({ err: err.message, stack: err.stack }, 'Initial MongoDB connection failed');
    // If not in production and live Atlas is not reachable, fallback to MongoMemoryServer so the app still runs locally!
    if (process.env.NODE_ENV !== 'production' && !memoryServer) {
      logger.warn('Attempting fallback to local MongoMemoryServer for local preview and development...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const fallbackUri = memoryServer.getUri();
        await mongoose.connect(fallbackUri);
        logger.info({ fallbackUri }, 'Fallback to MongoMemoryServer succeeded. Application is fully operational!');
        return;
      } catch (fallbackErr: any) {
        logger.error({ fallbackErr: fallbackErr.message }, 'Fallback to MongoMemoryServer also failed');
      }
    }
    throw err;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    logger.info('Database disconnected cleanly');
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error disconnecting database');
  }
};
