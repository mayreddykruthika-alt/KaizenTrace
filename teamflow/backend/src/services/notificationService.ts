import mongoose from 'mongoose';
import { Notification, NotificationType, INotification } from '../models/Notification.js';
import { instrumentDbOperation } from '../repositories/dbInstrument.js';
import { logger } from '../logger/index.js';

export interface CreateNotificationParams {
  recipientId: string;
  type: NotificationType;
  message: string;
  relatedEntityType: 'task' | 'project';
  relatedEntityId: string;
  relatedEntityTitle: string;
  preventDuplicateWithinHours?: number;
  requestId?: string;
}

export class NotificationService {
  static async createNotification(params: CreateNotificationParams): Promise<INotification | null> {
    const { recipientId, type, message, relatedEntityType, relatedEntityId, relatedEntityTitle, preventDuplicateWithinHours, requestId } = params;

    // Check duplicate if window specified (e.g. deadline reminders)
    if (preventDuplicateWithinHours && preventDuplicateWithinHours > 0) {
      const since = new Date(Date.now() - preventDuplicateWithinHours * 60 * 60 * 1000);
      const existing = await Notification.findOne({
        recipientId: new mongoose.Types.ObjectId(recipientId),
        type,
        relatedEntityId,
        createdAt: { $gte: since },
      });

      if (existing) {
        logger.info({
          type: 'NOTIFICATION_DEDUPLICATED',
          recipientId,
          notificationType: type,
          relatedEntityId,
          requestId,
        }, 'Duplicate notification suppressed within suppression window');
        return null;
      }
    }

    return instrumentDbOperation(
      {
        collection: 'notifications',
        operation: 'create',
        entityId: relatedEntityId,
        requestId,
      },
      async () => {
        const notif = new Notification({
          recipientId: new mongoose.Types.ObjectId(recipientId),
          type,
          message,
          relatedEntityType,
          relatedEntityId,
          relatedEntityTitle,
        });

        const saved = await notif.save();
        logger.info({
          type: 'NOTIFICATION_CREATED',
          notificationId: saved._id.toString(),
          recipientId,
          notificationType: type,
          requestId,
        }, `Notification created for user ${recipientId}`);

        return saved;
      }
    );
  }

  static async getUserNotifications(userId: string, query: { limit?: number; unreadOnly?: boolean; requestId?: string }) {
    const filter: Record<string, any> = {
      recipientId: new mongoose.Types.ObjectId(userId),
    };

    if (query.unreadOnly) {
      filter.readAt = { $exists: false };
    }

    const limit = Math.min(query.limit || 30, 100);

    return instrumentDbOperation(
      {
        collection: 'notifications',
        operation: 'find',
        requestId: query.requestId,
      },
      async () => {
        const [notifications, unreadCount] = await Promise.all([
          Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
          Notification.countDocuments({
            recipientId: new mongoose.Types.ObjectId(userId),
            readAt: { $exists: false },
          }),
        ]);

        return {
          notifications,
          unreadCount,
        };
      }
    );
  }

  static async markAsRead(notificationId: string, userId: string, requestId?: string) {
    return instrumentDbOperation(
      {
        collection: 'notifications',
        operation: 'update',
        entityId: notificationId,
        requestId,
      },
      async () => {
        return Notification.findOneAndUpdate(
          {
            _id: new mongoose.Types.ObjectId(notificationId),
            recipientId: new mongoose.Types.ObjectId(userId),
          },
          { $set: { readAt: new Date() } },
          { new: true }
        ).lean();
      }
    );
  }

  static async markAllAsRead(userId: string, requestId?: string) {
    return instrumentDbOperation(
      {
        collection: 'notifications',
        operation: 'update',
        requestId,
      },
      async () => {
        const result = await Notification.updateMany(
          {
            recipientId: new mongoose.Types.ObjectId(userId),
            readAt: { $exists: false },
          },
          { $set: { readAt: new Date() } }
        );

        logger.info({
          recipientId: userId,
          modifiedCount: result.modifiedCount,
          requestId,
        }, 'Marked all notifications as read');

        return { modifiedCount: result.modifiedCount };
      }
    );
  }
}
