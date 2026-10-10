import mongoose from 'mongoose';
import { Project, IProject, ProjectStatus } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { AppError } from '../utils/errors.js';
import { instrumentDbOperation } from '../repositories/dbInstrument.js';
import { ActivityService } from './activityService.js';
import { logger } from '../logger/index.js';

export class ProjectService {
  static async listProjects(query: {
    status?: ProjectStatus;
    search?: string;
    isArchived?: boolean;
    memberId?: string;
    requestId?: string;
  }) {
    const filter: Record<string, any> = {};

    if (query.isArchived !== undefined) {
      filter.isArchived = query.isArchived;
    } else {
      filter.isArchived = false;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.memberId) {
      filter.$or = [
        { ownerId: new mongoose.Types.ObjectId(query.memberId) },
        { memberIds: new mongoose.Types.ObjectId(query.memberId) },
      ];
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
        { category: { $regex: query.search, $options: 'i' } },
      ];
    }

    return instrumentDbOperation(
      {
        collection: 'projects',
        operation: 'find',
        requestId: query.requestId,
      },
      async () => {
        const projects = await Project.find(filter)
          .populate('ownerId', 'name email role avatar')
          .populate('memberIds', 'name email role avatar title')
          .sort({ updatedAt: -1 })
          .lean();

        // Calculate live progress and task metrics from database
        const enriched = await Promise.all(
          projects.map(async (p) => {
            const projectId = p._id;
            const [totalTasks, completedTasks, urgentTasks] = await Promise.all([
              Task.countDocuments({ projectId }),
              Task.countDocuments({ projectId, status: 'done' }),
              Task.countDocuments({ projectId, priority: 'urgent', status: { $ne: 'done' } }),
            ]);

            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return {
              ...p,
              id: p._id.toString(),
              totalTasks,
              completedTasks,
              urgentTasks,
              progress,
            };
          })
        );

        return enriched;
      }
    );
  }

  static async getProjectById(id: string, requestId?: string) {
    return instrumentDbOperation(
      {
        collection: 'projects',
        operation: 'findById',
        entityId: id,
        requestId,
      },
      async () => {
        const project = await Project.findById(id)
          .populate('ownerId', 'name email role avatar title')
          .populate('memberIds', 'name email role avatar title')
          .lean();

        if (!project) {
          throw AppError.notFound(`Project with ID ${id} not found`, 'PROJECT_NOT_FOUND');
        }

        const projectId = project._id;
        const [totalTasks, completedTasks, inProgressTasks, todoTasks, tasks] = await Promise.all([
          Task.countDocuments({ projectId }),
          Task.countDocuments({ projectId, status: 'done' }),
          Task.countDocuments({ projectId, status: 'in_progress' }),
          Task.countDocuments({ projectId, status: 'todo' }),
          Task.find({ projectId }).populate('assigneeId', 'name email avatar').sort({ dueDate: 1 }).limit(10).lean(),
        ]);

        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          ...project,
          id: project._id.toString(),
          metrics: {
            totalTasks,
            completedTasks,
            inProgressTasks,
            todoTasks,
            progress,
          },
          recentTasks: tasks.map(t => ({ ...t, id: t._id.toString() })),
        };
      }
    );
  }

  static async createProject(
    data: {
      name: string;
      description?: string;
      status?: ProjectStatus;
      startDate?: Date | string;
      dueDate: Date | string;
      memberIds?: string[];
      category?: string;
    },
    actor: { id: string; name: string },
    requestId?: string
  ) {
    return instrumentDbOperation(
      {
        collection: 'projects',
        operation: 'create',
        requestId,
      },
      async () => {
        const memberObjectIds = (data.memberIds || []).map((mId) => new mongoose.Types.ObjectId(mId));
        // Always include owner in members if not already present
        const ownerObjectId = new mongoose.Types.ObjectId(actor.id);
        if (!memberObjectIds.some((m) => m.equals(ownerObjectId))) {
          memberObjectIds.push(ownerObjectId);
        }

        const project = new Project({
          name: data.name,
          description: data.description || '',
          status: data.status || 'planning',
          startDate: data.startDate ? new Date(data.startDate) : new Date(),
          dueDate: new Date(data.dueDate),
          ownerId: ownerObjectId,
          memberIds: memberObjectIds,
          category: data.category || 'Product Development',
        });

        const saved = await project.save();

        await ActivityService.recordEvent({
          actor,
          action: 'project_created',
          entityType: 'project',
          entityId: saved._id.toString(),
          entityTitle: saved.name,
          projectId: saved._id.toString(),
          projectName: saved.name,
          after: {
            name: saved.name,
            status: saved.status,
            dueDate: saved.dueDate,
          },
          requestId,
        });

        logger.info({
          projectId: saved._id.toString(),
          name: saved.name,
          actorId: actor.id,
          requestId,
        }, 'Project created successfully');

        return saved;
      }
    );
  }

  static async updateProject(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      status: ProjectStatus;
      startDate: Date | string;
      dueDate: Date | string;
      memberIds: string[];
      category: string;
    }>,
    actor: { id: string; name: string },
    requestId?: string
  ) {
    const project = await Project.findById(id);
    if (!project) {
      throw AppError.notFound(`Project with ID ${id} not found`, 'PROJECT_NOT_FOUND');
    }

    const before = {
      name: project.name,
      description: project.description,
      status: project.status,
      dueDate: project.dueDate,
      memberCount: project.memberIds.length,
    };

    if (data.name !== undefined) project.name = data.name;
    if (data.description !== undefined) project.description = data.description;
    if (data.status !== undefined) project.status = data.status;
    if (data.startDate !== undefined) project.startDate = new Date(data.startDate);
    if (data.dueDate !== undefined) project.dueDate = new Date(data.dueDate);
    if (data.category !== undefined) project.category = data.category;
    if (data.memberIds !== undefined) {
      project.memberIds = data.memberIds.map((mId) => new mongoose.Types.ObjectId(mId));
    }

    const updated = await project.save();

    await ActivityService.recordEvent({
      actor,
      action: 'project_updated',
      entityType: 'project',
      entityId: project._id.toString(),
      entityTitle: project.name,
      projectId: project._id.toString(),
      projectName: project.name,
      before,
      after: {
        name: updated.name,
        description: updated.description,
        status: updated.status,
        dueDate: updated.dueDate,
        memberCount: updated.memberIds.length,
      },
      requestId,
    });

    return updated;
  }

  static async archiveProject(id: string, actor: { id: string; name: string }, requestId?: string) {
    const project = await Project.findById(id);
    if (!project) {
      throw AppError.notFound(`Project with ID ${id} not found`, 'PROJECT_NOT_FOUND');
    }

    project.isArchived = true;
    project.archivedAt = new Date();
    const updated = await project.save();

    await ActivityService.recordEvent({
      actor,
      action: 'project_archived',
      entityType: 'project',
      entityId: project._id.toString(),
      entityTitle: project.name,
      projectId: project._id.toString(),
      projectName: project.name,
      requestId,
    });

    return updated;
  }
}
