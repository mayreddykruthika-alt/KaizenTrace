import { config } from './config.js';
import { connectDatabase } from './database.js';
import { createApp } from './app.js';

async function startServer() {
  console.log('--- Starting KaizenTrace Backend ---');
  console.log(`Port: ${config.port}`);
  console.log(`Target TeamFlow Path: ${config.teamflowPath}`);

  // Connect to MongoDB (Atlas or In-Memory fallback)
  const dbStatus = await connectDatabase();
  console.log(`Database Status: ${dbStatus.connected ? 'ONLINE' : 'OFFLINE'} (Host: ${dbStatus.host})`);

  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`⚡ KaizenTrace Backend is live and listening on http://localhost:${config.port}`);
    console.log(`Health endpoint: http://localhost:${config.port}/api/health`);
    console.log(`Project endpoint: http://localhost:${config.port}/api/project`);
  });

  const shutdown = async () => {
    console.log('Shutting down KaizenTrace gracefully...');
    server.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Fatal error starting KaizenTrace backend:', err);
  process.exit(1);
});
