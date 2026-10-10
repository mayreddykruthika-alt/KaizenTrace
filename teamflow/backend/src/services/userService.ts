import mongoose from 'mongoose';
import { User, IUser, UserRole } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { AppError } from '../utils/errors.js';
import { instrumentDbOperation } from '../repositories/dbInstrument.js';
import { ActivityService } from './activityService.js';
import { logger } from '../logger/index.js';

export class UserService {
  static async listUsers(query: { isActive?: boolean; role?: string; search?: string; requestId?: string }) {
    const filter: Record<string, any> = {};

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }
    if (query.role) {
      filter.role = query.role;
    }
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { department: { $regex: query.search, $options: 'i' } },
      ];
    }

    return instrumentDbOperation(
      {
        collection: 'users',
        operation: 'find',
        requestId: query.requestId,
      },
      async () => {
        const users = await User.find(filter).sort({ name: 1 }).lean();

        // Enrich users with project and task counts directly from database!
        const enriched = await Promise.all(
          users.map(async (u) => {
            const userId = u._id;
            const [projectCount, taskCount] = await Promise.all([
              Project.countDocuments({
                $or: [{ ownerId: userId }, { memberIds: userId }],
                isArchived: false,
              }),
              Task.countDocuments({
                assigneeId: userId,
                status: { $ne: 'done' },
              }),
            ]);

            return {
              ...u,
              id: u._id.toString(),
              projectCount,
              taskCount,
            };
          })
        );

        return enriched;
      }
    );
  }

  static async getUserById(id: string, requestId?: string) {
    return instrumentDbOperation(
      {
        collection: 'users',
        operation: 'findById',
        entityId: id,
        requestId,
      },
      async () => {
        const user = await User.findById(id).lean();
        if (!user) {
          throw AppError.notFound(`User with ID ${id} not found`, 'USER_NOT_FOUND');
        }
        return { ...user, id: user._id.toString() };
      }
    );
  }

  static async createUser(
    data: { name: string; email: string; role: UserRole; title?: string; department?: string; avatar?: string },
    actor: { id: string; name: string },
    requestId?: string
  ) {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw AppError.conflict(`A user with email ${data.email} already exists`);
    }

    return instrumentDbOperation(
      {
        collection: 'users',
        operation: 'create',
        requestId,
      },
      async () => {
        const newUser = new User({
          name: data.name,
          email: data.email,
          role: data.role,
          title: data.title || 'Team Member',
          department: data.department || 'Engineering',
          avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,
          isActive: true,
        });

        const saved = await newUser.save();

        await ActivityService.recordEvent({
          actor,
          action: 'user_status_changed',
          entityType: 'user',
          entityId: saved._id.toString(),
          entityTitle: saved.name,
          after: { role: saved.role, email: saved.email },
          requestId,
        });

        return saved;
      }
    );
  }

  static async updateUser(
    id: string,
    data: Partial<Pick<IUser, 'name' | 'title' | 'department' | 'avatar'>>,
    actor: { id: string; name: string },
    requestId?: string
  ) {
    const user = await User.findById(id);
    if (!user) {
      throw AppError.notFound(`User with ID ${id} not found`, 'USER_NOT_FOUND');
    }

    const before = { name: user.name, title: user.title, department: user.department };

    if (data.name) user.name = data.name;
    if (data.title) user.title = data.title;
    if (data.department) user.department = data.department;
    if (data.avatar) user.avatar = data.avatar;

    const updated = await user.save();

    await ActivityService.recordEvent({
      actor,
      action: 'user_status_changed',
      entityType: 'user',
      entityId: user._id.toString(),
      entityTitle: user.name,
      before,
      after: { name: user.name, title: user.title, department: user.department },
      requestId,
    });

    return updated;
  }

  static async changeUserRole(
    id: string,
    newRole: UserRole,
    actor: { id: string; name: string },
    requestId?: string
  ) {
    const user = await User.findById(id);
    if (!user) {
      throw AppError.notFound(`User with ID ${id} not found`, 'USER_NOT_FOUND');
    }

    const previousRole = user.role;
    user.role = newRole;
    const updated = await user.save();

    logger.info({
      userId: id,
      previousRole,
      newRole,
      actorId: actor.id,
      requestId,
    }, 'User role updated');

    await ActivityService.recordEvent({
      actor,
      action: 'user_role_changed',
      entityType: 'user',
      entityId: user._id.toString(),
      entityTitle: user.name,
      before: { role: previousRole },
      after: { role: newRole },
      requestId,
    });

    return updated;
  }

  static async toggleUserStatus(
    id: string,
    isActive: boolean,
    actor: { id: string; name: string },
    requestId?: string
  ) {
    const user = await User.findById(id);
    if (!user) {
      throw AppError.notFound(`User with ID ${id} not found`, 'USER_NOT_FOUND');
    }

    const previousStatus = user.isActive;
    user.isActive = isActive;
    const updated = await user.save();

    logger.info({
      userId: id,
      previousStatus,
      isActive,
      actorId: actor.id,
      requestId,
    }, `User status changed to ${isActive ? 'active' : 'inactive'}`);

    await ActivityService.recordEvent({
      actor,
      action: 'user_status_changed',
      entityType: 'user',
      entityId: user._id.toString(),
      entityTitle: user.name,
      before: { isActive: previousStatus },
      after: { isActive },
      requestId,
    });

    return updated;
  }
}
