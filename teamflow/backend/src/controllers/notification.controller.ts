import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notificationService.js';
import { AppError } from '../utils/errors.js';

export class NotificationController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.actor) {
        throw AppError.unauthorized('Authentication required');
      }

      const { limit, unreadOnly } = req.query;
      const result = await NotificationService.getUserNotifications(req.actor.id, {
        limit: limit ? parseInt(limit as string, 10) : undefined,
        unreadOnly: unreadOnly === 'true',
        requestId: req.id,
      });

      res.json({
        success: true,
        data: result.notifications,
        unreadCount: result.unreadCount,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.actor) {
        throw AppError.unauthorized('Authentication required');
      }

      const updated = await NotificationService.markAsRead(req.params.id, req.actor.id, req.id);
      if (!updated) {
        throw AppError.notFound('Notification not found or does not belong to you', 'BAD_REQUEST');
      }

      res.json({
        success: true,
        data: updated,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.actor) {
        throw AppError.unauthorized('Authentication required');
      }

      const result = await NotificationService.markAllAsRead(req.actor.id, req.id);
      res.json({
        success: true,
        message: 'All notifications marked as read',
        data: result,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }
}
