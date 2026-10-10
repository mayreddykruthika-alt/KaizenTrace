import { createApp } from './app.js';
import { env } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { DeadlineReminderJob } from './jobs/deadlineReminderJob.js';
import { seedDatabase } from './utils/seedData.js';
import { User } from './models/User.js';
import { logger } from './logger/index.js';

async function bootstrap() {
  try {
    logger.info('Initializing TeamFlow backend service...');

    // 1. Connect Database
    await connectDatabase();

    // 2. Auto-seed if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      logger.info('Empty database detected. Seeding initial baseline demo dataset...');
      await seedDatabase(false);
    }

    // 3. Start background job scheduler
    if (env.ENABLE_DEADLINE_JOB) {
      DeadlineReminderJob.startScheduler(env.DEADLINE_JOB_INTERVAL_MS);
    }

    // 4. Create Express app & listen
    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info({
        port: env.PORT,
        env: env.NODE_ENV,
        url: `http://localhost:${env.PORT}`,
      }, `🚀 TeamFlow Backend API listening on port ${env.PORT}`);
    });

    // 5. Graceful shutdown
    const handleShutdown = async (signal: string) => {
      logger.info({ signal }, 'Graceful shutdown signal received');
      DeadlineReminderJob.stopScheduler();
      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

  } catch (err: any) {
    logger.fatal({ err: err.message, stack: err.stack }, 'Fatal error during server startup');
    process.exit(1);
  }
}

bootstrap();
