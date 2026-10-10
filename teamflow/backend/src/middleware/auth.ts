import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../logger/index.js';
import { env } from '../config/index.js';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actorIdHeader = req.headers['x-actor-id'] as string;

    let user = null;

    if (actorIdHeader) {
      user = await User.findById(actorIdHeader);
      if (!user || !user.isActive) {
        throw AppError.unauthorized('User associated with x-actor-id is not found or inactive');
      }
    } else {
      // Fallback to first active admin in database (demo convenience)
      user = await User.findOne({ role: 'admin', isActive: true });
      if (!user) {
        user = await User.findOne({ isActive: true });
      }
    }

    if (user) {
      req.actor = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      };
    }

    next();
  } catch (err) {
    next(err);
  }
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.actor) {
    throw AppError.unauthorized('Authentication required to access this resource');
  }
  next();
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // If scenario fault injection is toggled to disable permissions:
    if (env.TEST_DISABLE_PERMISSIONS) {
      logger.warn({
        requestId: req.id,
        actorId: req.actor?.id,
        actorRole: req.actor?.role,
      }, '[FAULT_INJECTION] TEST_DISABLE_PERMISSIONS active - bypassing role verification');
      return next();
    }

    if (!req.actor) {
      throw AppError.unauthorized('Authentication required');
    }

    if (!allowedRoles.includes(req.actor.role)) {
      logger.warn({
        requestId: req.id,
        actorId: req.actor.id,
        actorRole: req.actor.role,
        requiredRoles: allowedRoles,
        url: req.originalUrl,
        method: req.method,
      }, 'Authorization failed: role does not have required permissions');

      throw AppError.forbidden(`Role '${req.actor.role}' is not authorized to perform this operation`);
    }

    next();
  };
};
