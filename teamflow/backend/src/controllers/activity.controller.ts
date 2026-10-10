import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../services/activityService.js';
import { AppError } from '../utils/errors.js';

export class ActivityController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, actorId, action, entityType, limit, page } = req.query;

      const result = await ActivityService.listEvents({
        projectId: projectId as string,
        actorId: actorId as string,
        action: action as string,
        entityType: entityType as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        requestId: req.id,
      });

      res.json({
        success: true,
        data: result.events,
        pagination: result.pagination,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await ActivityService.getEventById(req.params.id, req.id);
      if (!event) {
        throw AppError.notFound(`Activity event with ID ${req.params.id} not found`, 'BAD_REQUEST');
      }

      res.json({
        success: true,
        data: event,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }
}
