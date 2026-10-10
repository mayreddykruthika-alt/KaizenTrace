import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService.js';

export class UserController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isActive, role, search } = req.query;
      const users = await UserService.listUsers({
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        role: role as string,
        search: search as string,
        requestId: req.id,
      });

      res.json({
        success: true,
        data: users,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.getUserById(req.params.id, req.id);
      res.json({
        success: true,
        data: user,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = req.actor!;
      const user = await UserService.createUser(req.body, actor, req.id);
      res.status(201).json({
        success: true,
        data: user,
        message: 'Team member added successfully',
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = req.actor!;
      const user = await UserService.updateUser(req.params.id, req.body, actor, req.id);
      res.json({
        success: true,
        data: user,
        message: 'Member details updated',
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = req.actor!;
      const user = await UserService.changeUserRole(req.params.id, req.body.role, actor, req.id);
      res.json({
        success: true,
        data: user,
        message: `Member role updated to ${req.body.role}`,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = req.actor!;
      const user = await UserService.toggleUserStatus(req.params.id, req.body.isActive, actor, req.id);
      res.json({
        success: true,
        data: user,
        message: `Member status updated to ${req.body.isActive ? 'active' : 'inactive'}`,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }
}
