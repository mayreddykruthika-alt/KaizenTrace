import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/taskService.js';
import { TaskStatus, TaskPriority } from '../models/Task.js';

export class TaskController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, assigneeId, status, priority, search, isOverdue, sort, sortOrder, limit, page } = req.query;

      const result = await TaskService.listTasks({
        projectId: projectId as string,
        assigneeId: assigneeId as string,
        status: status as TaskStatus,
        priority: priority as TaskPriority,
        search: search as string,
        isOverdue: isOverdue === 'true',
        sort: sort as any,
        sortOrder: sortOrder as any,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        requestId: req.id,
      });

      res.json({
        success: true,
        data: result.tasks,
        pagination: result.pagination,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.getTaskById(req.params.id, req.id);
      res.json({
        success: true,
        data: task,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = req.actor!;
      const task = await TaskService.createTask(req.body, actor, req.id);
      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully',
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = req.actor!;
      const updated = await TaskService.updateTask(req.params.id, req.body, actor, req.id);
      res.json({
        success: true,
        data: updated,
        message: 'Task updated successfully',
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = req.actor!;
      const updated = await TaskService.updateTaskStatus(req.params.id, req.body.status, actor, req.id);
      res.json({
        success: true,
        data: updated,
        message: 'Task status updated successfully',
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = req.actor!;
      const updated = await TaskService.addComment(req.params.id, req.body.text, actor, req.id);
      res.status(201).json({
        success: true,
        data: updated,
        message: 'Comment added successfully',
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = req.actor!;
      const result = await TaskService.deleteTask(req.params.id, actor, req.id);
      res.json({
        success: true,
        data: result,
        message: 'Task deleted successfully. Audit event preserved.',
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }
}
