import mongoose from 'mongoose';
import { ActivityEvent, ActivityAction, EntityType, IActivityEvent } from '../models/ActivityEvent.js';
import { instrumentDbOperation } from '../repositories/dbInstrument.js';
import { logger } from '../logger/index.js';

export interface CreateActivityParams {
  actor: {
    id: string;
    name: string;
    email?: string;
  };
  action: ActivityAction;
  entityType: EntityType;
  entityId: string;
  entityTitle: string;
  projectId?: string;
  projectName?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  requestId?: string;
}

export class ActivityService {
  static async recordEvent(params: CreateActivityParams): Promise<IActivityEvent> {
    return instrumentDbOperation(
      {
        collection: 'activity_events',
        operation: 'create',
        entityId: params.entityId,
        requestId: params.requestId,
      },
      async () => {
        const event = new ActivityEvent({
          actorId: new mongoose.Types.ObjectId(params.actor.id),
          actorName: params.actor.name,
          actorEmail: params.actor.email,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          entityTitle: params.entityTitle,
          projectId: params.projectId ? new mongoose.Types.ObjectId(params.projectId) : undefined,
          projectName: params.projectName,
          before: params.before,
          after: params.after,
          requestId: params.requestId,
        });

        const saved = await event.save();
        logger.info({
          type: 'AUDIT_EVENT',
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          actorId: params.actor.id,
          requestId: params.requestId,
        }, `Authoritative audit event recorded: ${params.action}`);

        return saved;
      }
    );
  }

  static async listEvents(query: {
    projectId?: string;
    actorId?: string;
    action?: string;
    entityType?: string;
    limit?: number;
    page?: number;
    requestId?: string;
  }) {
    const filter: Record<string, any> = {};
    if (query.projectId) {
      filter.projectId = new mongoose.Types.ObjectId(query.projectId);
    }
    if (query.actorId) {
      filter.actorId = new mongoose.Types.ObjectId(query.actorId);
    }
    if (query.action) {
      filter.action = query.action;
    }
    if (query.entityType) {
      filter.entityType = query.entityType;
    }

    const limit = Math.min(query.limit || 50, 100);
    const page = Math.max(query.page || 1, 1);
    const skip = (page - 1) * limit;

    return instrumentDbOperation(
      {
        collection: 'activity_events',
        operation: 'find',
        requestId: query.requestId,
      },
      async () => {
        const [events, total] = await Promise.all([
          ActivityEvent.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          ActivityEvent.countDocuments(filter),
        ]);

        return {
          events,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      }
    );
  }

  static async getEventById(id: string, requestId?: string) {
    return instrumentDbOperation(
      {
        collection: 'activity_events',
        operation: 'findById',
        entityId: id,
        requestId,
      },
      async () => {
        return ActivityEvent.findById(id).lean();
      }
    );
  }
}
