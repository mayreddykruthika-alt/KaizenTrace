import http from 'http';
import { IHealthStatus } from '../models/types.js';

export class HealthCheckService {
  /**
   * Check TeamFlow application health and database connection
   */
  static async checkTeamFlowHealth(port = 5000): Promise<IHealthStatus> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const req = http.get(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/health',
          timeout: 3000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            const latencyMs = Date.now() - startTime;
            let details: any = null;
            let dbConnected = false;

            try {
              details = JSON.parse(data);
              dbConnected = details.database?.connected === true || details.status === 'ok';
            } catch {
              details = { raw: data };
            }

            resolve({
              serverRunning: res.statusCode === 200,
              dbConnected,
              statusCode: res.statusCode,
              latencyMs,
              details,
            });
          });
        }
      );

      req.on('error', (err) => {
        resolve({
          serverRunning: false,
          dbConnected: false,
          statusCode: 0,
          latencyMs: Date.now() - startTime,
          details: { error: err.message },
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          serverRunning: false,
          dbConnected: false,
          statusCode: 408,
          latencyMs: Date.now() - startTime,
          details: { error: 'Request timed out' },
        });
      });
    });
  }
}
