import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';

export class AuthController {
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.actor) {
        throw AppError.unauthorized('No authenticated actor');
      }

      const user = await User.findById(req.actor.id).lean();
      if (!user) {
        throw AppError.notFound('User not found', 'USER_NOT_FOUND');
      }

      res.json({
        success: true,
        data: {
          ...user,
          id: user._id.toString(),
        },
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async demoLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, role } = req.body;

      let user = null;
      if (userId) {
        user = await User.findById(userId).lean();
      } else if (role) {
        user = await User.findOne({ role, isActive: true }).lean();
      } else {
        user = await User.findOne({ role: 'admin', isActive: true }).lean();
      }

      if (!user) {
        throw AppError.notFound('Demo user not found', 'USER_NOT_FOUND');
      }

      res.json({
        success: true,
        data: {
          ...user,
          id: user._id.toString(),
        },
        message: `Authenticated as ${user.name} (${user.role})`,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDemoUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await User.find({ isActive: true })
        .select('name email role avatar title department')
        .sort({ role: 1, name: 1 })
        .lean();

      res.json({
        success: true,
        data: users.map(u => ({ ...u, id: u._id.toString() })),
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }
}
