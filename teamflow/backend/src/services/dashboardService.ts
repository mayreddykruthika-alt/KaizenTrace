import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { ActivityEvent } from '../models/ActivityEvent.js';
import { instrumentDbOperation } from '../repositories/dbInstrument.js';

export class DashboardService {
  static async getSummary(requestId?: string) {
    return instrumentDbOperation(
      {
        collection: 'analytics',
        operation: 'aggregate',
        requestId,
      },
      async () => {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const [
          totalProjects,
          activeProjects,
          completedProjects,
          totalTasks,
          completedTasks,
          overdueTasks,
          completedThisWeek,
          activeMembers,
        ] = await Promise.all([
          Project.countDocuments({ isArchived: false }),
          Project.countDocuments({ status: 'active', isArchived: false }),
          Project.countDocuments({ status: 'completed', isArchived: false }),
          Task.countDocuments(),
          Task.countDocuments({ status: 'done' }),
          Task.countDocuments({ dueDate: { $lt: now }, status: { $ne: 'done' } }),
          Task.countDocuments({ status: 'done', completedAt: { $gte: startOfWeek } }),
          User.countDocuments({ isActive: true }),
        ]);

        const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          projects: {
            total: totalProjects,
            active: activeProjects,
            completed: completedProjects,
          },
          tasks: {
            total: totalTasks,
            completed: completedTasks,
            overdue: overdueTasks,
            completedThisWeek,
            completionRate: overallProgress,
          },
          team: {
            activeMembers,
          },
        };
      }
    );
  }

  static async getTaskStatusBreakdown(requestId?: string) {
    return instrumentDbOperation(
      {
        collection: 'tasks',
        operation: 'aggregate',
        requestId,
      },
      async () => {
        const [statusAgg, priorityAgg] = await Promise.all([
          Task.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ]),
          Task.aggregate([
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ]),
        ]);

        // Standardize status output with clean zero defaults
        const statuses = ['todo', 'in_progress', 'in_review', 'done'];
        const byStatus = statuses.map((s) => {
          const found = statusAgg.find((item) => item._id === s);
          return {
            status: s,
            name: s === 'todo' ? 'To Do' : s === 'in_progress' ? 'In Progress' : s === 'in_review' ? 'In Review' : 'Done',
            count: found ? found.count : 0,
          };
        });

        const priorities = ['low', 'medium', 'high', 'urgent'];
        const byPriority = priorities.map((p) => {
          const found = priorityAgg.find((item) => item._id === p);
          return {
            priority: p,
            name: p.charAt(0).toUpperCase() + p.slice(1),
            count: found ? found.count : 0,
          };
        });

        return {
          byStatus,
          byPriority,
        };
      }
    );
  }

  static async getRecentActivity(limit = 10, requestId?: string) {
    return instrumentDbOperation(
      {
        collection: 'activity_events',
        operation: 'find',
        requestId,
      },
      async () => {
        return ActivityEvent.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();
      }
    );
  }
}
