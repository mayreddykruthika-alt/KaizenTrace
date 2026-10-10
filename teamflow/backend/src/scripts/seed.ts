import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { seedDatabase } from '../utils/seedData.js';
import { logger } from '../logger/index.js';

async function main() {
  try {
    await connectDatabase();
    await seedDatabase(true);
    logger.info('Database seeded successfully.');
  } catch (err: any) {
    logger.error({ err: err.message }, 'Database seed script failed');
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

main();
