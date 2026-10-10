import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Task, ITask, TaskStatus, TaskPriority } from '../models/Task.js';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { instrumentDbOperation } from '../repositories/dbInstrument.js';
import { ActivityService } from './activityService.js';
import { NotificationService } from './notificationService.js';
import { logger } from '../logger/index.js';
import { env } from '../config/index.js';

export class TaskService {
  static async listTasks(query: {
    projectId?: string;
    assigneeId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
    isOverdue?: boolean;
    sort?: 'dueDate' | 'priority' | 'createdAt' | 'status';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    page?: number;
    requestId?: string;
  }) {
    const filter: Record<string, any> = {};

    if (query.projectId) {
      filter.projectId = new mongoose.Types.ObjectId(query.projectId);
    }
    if (query.assigneeId) {
      filter.assigneeId = new mongoose.Types.ObjectId(query.assigneeId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.priority) {
      filter.priority = query.priority;
    }
    if (query.isOverdue) {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $ne: 'done' };
    }
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    const sortField = query.sort || 'dueDate';
    const sortDirection = query.sortOrder === 'desc' ? -1 : 1;
    const sortObj: Record<string, any> = { [sortField]: sortDirection };

    const limit = Math.min(query.limit || 100, 200);
    const page = Math.max(query.page || 1, 1);
    const skip = (page - 1) * limit;

    return instrumentDbOperation(
      {
        collection: 'tasks',
        operation: 'find',
        requestId: query.requestId,
      },
      async () => {
        const [tasks, total] = await Promise.all([
          Task.find(filter)
            .populate('projectId', 'name status')
            .populate('assigneeId', 'name email role avatar')
            .populate('createdBy', 'name email avatar')
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .lean(),
          Task.countDocuments(filter),
        ]);

        return {
          tasks: tasks.map(t => ({ ...t, id: t._id.toString() })),
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

  static async getTaskById(id: string, requestId?: string) {
    return instrumentDbOperation(
      {
        collection: 'tasks',
        operation: 'findById',
        entityId: id,
        requestId,
      },
      async () => {
        const task = await Task.findById(id)
          .populate('projectId', 'name status ownerId memberIds')
          .populate('assigneeId', 'name email role avatar title')
          .populate('createdBy', 'name email role avatar')
          .lean();

        if (!task) {
          throw AppError.notFound(`Task with ID ${id} not found`, 'TASK_NOT_FOUND');
        }

        return { ...task, id: task._id.toString() };
      }
    );
  }

  static async createTask(
    data: {
      title: string;
      description?: string;
      projectId: string;
      assigneeId?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      startDate?: Date | string;
      dueDate: Date | string;
    },
    actor: { id: string; name: string },
    requestId?: string
  ) {
    const project = await Project.findById(data.projectId);
    if (!project) {
      throw AppError.notFound(`Project with ID ${data.projectId} not found`, 'PROJECT_NOT_FOUND');
    }

    return instrumentDbOperation(
      {
        collection: 'tasks',
        operation: 'create',
        requestId,
      },
      async () => {
        const task = new Task({
          title: data.title,
          description: data.description || '',
          projectId: new mongoose.Types.ObjectId(data.projectId),
          assigneeId: data.assigneeId ? new mongoose.Types.ObjectId(data.assigneeId) : undefined,
          createdBy: new mongoose.Types.ObjectId(actor.id),
          status: data.status || 'todo',
          priority: data.priority || 'medium',
          startDate: data.startDate ? new Date(data.startDate) : new Date(),
          dueDate: new Date(data.dueDate),
          completedAt: data.status === 'done' ? new Date() : undefined,
          comments: [],
        });

        const saved = await task.save();

        // 1. Authoritative Audit event
        await ActivityService.recordEvent({
          actor,
          action: 'task_created',
          entityType: 'task',
          entityId: saved._id.toString(),
          entityTitle: saved.title,
          projectId: project._id.toString(),
          projectName: project.name,
          after: {
            title: saved.title,
            status: saved.status,
            priority: saved.priority,
            dueDate: saved.dueDate,
            assigneeId: saved.assigneeId?.toString(),
          },
          requestId,
        });

        // 2. Notification to assignee if assigned to someone else
        if (saved.assigneeId && saved.assigneeId.toString() !== actor.id) {
          await NotificationService.createNotification({
            recipientId: saved.assigneeId.toString(),
            type: 'task_assigned',
            message: `${actor.name} assigned you to task "${saved.title}" in ${project.name}`,
            relatedEntityType: 'task',
            relatedEntityId: saved._id.toString(),
            relatedEntityTitle: saved.title,
            requestId,
          });
        }

        return saved;
      }
    );
  }

  static async updateTask(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      assigneeId: string | null;
      status: TaskStatus;
      priority: TaskPriority;
      startDate: Date | string;
      dueDate: Date | string;
    }>,
    actor: { id: string; name: string },
    requestId?: string
  ) {
    // KaizenTrace Scenario 4 fault simulation:
    if (env.TEST_FAIL_TASK_UPDATE) {
      logger.error({
        requestId,
        taskId: id,
        actorId: actor.id,
      }, '[FAULT_INJECTION] Simulated database persistence failure between update and audit recording');
      throw AppError.internal('Database write error during task state transaction', 'DATABASE_ERROR');
    }

    const task = await Task.findById(id);
    if (!task) {
      throw AppError.notFound(`Task with ID ${id} not found`, 'TASK_NOT_FOUND');
    }

    const project = await Project.findById(task.projectId);
    const projectName = project ? project.name : 'Unknown Project';

    const before = {
      title: task.title,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId?.toString() || null,
      dueDate: task.dueDate,
    };

    let assigneeChanged = false;
    let oldAssigneeId = task.assigneeId?.toString();

    if (data.title !== undefined) task.title = data.title;
    if (data.description !== undefined) task.description = data.description;
    if (data.priority !== undefined) task.priority = data.priority;
    if (data.startDate !== undefined) task.startDate = new Date(data.startDate);
    if (data.dueDate !== undefined) task.dueDate = new Date(data.dueDate);

    if (data.assigneeId !== undefined) {
      const newAssigneeId = data.assigneeId ? new mongoose.Types.ObjectId(data.assigneeId) : undefined;
      if (task.assigneeId?.toString() !== data.assigneeId) {
        assigneeChanged = true;
      }
      task.assigneeId = newAssigneeId;
    }

    let statusChanged = false;
    if (data.status !== undefined && data.status !== task.status) {
      statusChanged = true;
      task.status = data.status;
      if (data.status === 'done') {
        task.completedAt = new Date();
      } else {
        task.completedAt = undefined;
      }
    }

    const updated = await task.save();

    // Audit action determination
    let actionType: any = 'task_updated';
    if (statusChanged) actionType = 'task_status_changed';
    else if (assigneeChanged) actionType = 'task_assigned';

    await ActivityService.recordEvent({
      actor,
      action: actionType,
      entityType: 'task',
      entityId: task._id.toString(),
      entityTitle: task.title,
      projectId: task.projectId.toString(),
      projectName,
      before,
      after: {
        title: updated.title,
        status: updated.status,
        priority: updated.priority,
        assigneeId: updated.assigneeId?.toString() || null,
        dueDate: updated.dueDate,
      },
      requestId,
    });

    // Notifications
    if (assigneeChanged && updated.assigneeId && updated.assigneeId.toString() !== actor.id) {
      await NotificationService.createNotification({
        recipientId: updated.assigneeId.toString(),
        type: 'task_assigned',
        message: `${actor.name} assigned you to task "${updated.title}" in ${projectName}`,
        relatedEntityType: 'task',
        relatedEntityId: updated._id.toString(),
        relatedEntityTitle: updated.title,
        requestId,
      });
    }

    if (statusChanged && updated.status === 'done' && task.createdBy.toString() !== actor.id) {
      await NotificationService.createNotification({
        recipientId: task.createdBy.toString(),
        type: 'task_completed',
        message: `${actor.name} marked task "${updated.title}" as completed`,
        relatedEntityType: 'task',
        relatedEntityId: updated._id.toString(),
        relatedEntityTitle: updated.title,
        requestId,
      });
    }

    return updated;
  }

  static async updateTaskStatus(id: string, status: TaskStatus, actor: { id: string; name: string }, requestId?: string) {
    return this.updateTask(id, { status }, actor, requestId);
  }

  static async addComment(
    id: string,
    text: string,
    actor: { id: string; name: string; avatar?: string },
    requestId?: string
  ) {
    const task = await Task.findById(id);
    if (!task) {
      throw AppError.notFound(`Task with ID ${id} not found`, 'TASK_NOT_FOUND');
    }

    const comment = {
      id: uuidv4(),
      userId: new mongoose.Types.ObjectId(actor.id),
      userName: actor.name,
      userAvatar: actor.avatar,
      text,
      createdAt: new Date(),
    };

    task.comments.push(comment as any);
    const updated = await task.save();

    await ActivityService.recordEvent({
      actor,
      action: 'comment_added',
      entityType: 'task',
      entityId: task._id.toString(),
      entityTitle: task.title,
      projectId: task.projectId.toString(),
      after: { commentId: comment.id, text },
      requestId,
    });

    if (task.assigneeId && task.assigneeId.toString() !== actor.id) {
      await NotificationService.createNotification({
        recipientId: task.assigneeId.toString(),
        type: 'comment_added',
        message: `${actor.name} commented on "${task.title}": "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`,
        relatedEntityType: 'task',
        relatedEntityId: task._id.toString(),
        relatedEntityTitle: task.title,
        requestId,
      });
    }

    return updated;
  }

  static async deleteTask(id: string, actor: { id: string; name: string }, requestId?: string) {
    const task = await Task.findById(id);
    if (!task) {
      throw AppError.notFound(`Task with ID ${id} not found`, 'TASK_NOT_FOUND');
    }

    const project = await Project.findById(task.projectId);
    const projectName = project ? project.name : 'Unknown Project';

    const beforeSnapshot = {
      title: task.title,
      projectId: task.projectId.toString(),
      projectName,
      assigneeId: task.assigneeId?.toString() || null,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
    };

    await Task.findByIdAndDelete(id);

    // Crucial for KaizenTrace Scenario 2:
    // Even after task deletion, the audit record is preserved with full entityId and before snapshot!
    await ActivityService.recordEvent({
      actor,
      action: 'task_deleted',
      entityType: 'task',
      entityId: id,
      entityTitle: task.title,
      projectId: task.projectId.toString(),
      projectName,
      before: beforeSnapshot,
      requestId,
    });

    logger.info({
      type: 'TASK_DELETED',
      taskId: id,
      taskTitle: task.title,
      actorId: actor.id,
      requestId,
    }, `Task "${task.title}" deleted by actor ${actor.id}. Preserved audit record.`);

    return { success: true, deletedTaskId: id };
  }
}
