import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend or root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.KAIZENTRACE_PORT || '5050', 10),
  mongodbUri: process.env.MONGODB_URI || '',
  // Default to the sibling teamflow directory
  teamflowPath: process.env.TEAMFLOW_PATH
    ? path.resolve(process.env.TEAMFLOW_PATH)
    : path.resolve(__dirname, '../../../teamflow'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5180',
  logLevel: process.env.LOG_LEVEL || 'info',
};
