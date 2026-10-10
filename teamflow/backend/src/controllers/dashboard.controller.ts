import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboardService.js';

export class DashboardController {
  static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await DashboardService.getSummary(req.id);
      res.json({
        success: true,
        data: summary,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTaskStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const breakdown = await DashboardService.getTaskStatusBreakdown(req.id);
      res.json({
        success: true,
        data: breakdown,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const events = await DashboardService.getRecentActivity(limit, req.id);
      res.json({
        success: true,
        data: events,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }
}
