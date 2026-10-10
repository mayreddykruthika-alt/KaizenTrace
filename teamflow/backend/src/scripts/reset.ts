import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { seedDatabase } from '../utils/seedData.js';
import { logger } from '../logger/index.js';

async function main() {
  try {
    await connectDatabase();
    logger.info('Resetting and restoring clean demo dataset...');
    await seedDatabase(true);
    logger.info('Reset completed.');
  } catch (err: any) {
    logger.error({ err: err.message }, 'Database reset script failed');
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

main();
