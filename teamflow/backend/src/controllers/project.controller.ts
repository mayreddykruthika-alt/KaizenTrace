import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/projectService.js';
import { ProjectStatus } from '../models/Project.js';

export class ProjectController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, search, isArchived, memberId } = req.query;

      const projects = await ProjectService.listProjects({
        status: status as ProjectStatus,
        search: search as string,
        isArchived: isArchived !== undefined ? isArchived === 'true' : undefined,
        memberId: memberId as string,
        requestId: req.id,
      });

      res.json({
        success: true,
        data: projects,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await ProjectService.getProjectById(req.params.id, req.id);
      res.json({
        success: true,
        data: project,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = req.actor!;
      const project = await ProjectService.createProject(req.body, actor, req.id);
      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully',
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = req.actor!;
      const updated = await ProjectService.updateProject(req.params.id, req.body, actor, req.id);
      res.json({
        success: true,
        data: updated,
        message: 'Project updated successfully',
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = req.actor!;
      const archived = await ProjectService.archiveProject(req.params.id, actor, req.id);
      res.json({
        success: true,
        data: archived,
        message: 'Project archived successfully',
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }
}
