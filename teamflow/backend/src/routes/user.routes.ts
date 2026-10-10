import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createUserSchema,
  updateUserRoleSchema,
  toggleUserStatusSchema,
} from '../utils/schemas.js';

const router = Router();

router.get('/', UserController.list);
router.post('/', requireRole(['admin']), validate(createUserSchema), UserController.create);
router.get('/:id', UserController.getById);
router.patch('/:id', UserController.update);
router.patch('/:id/role', requireRole(['admin']), validate(updateUserRoleSchema), UserController.updateRole);
router.patch('/:id/active', requireRole(['admin']), validate(toggleUserStatusSchema), UserController.toggleActive);

export default router;
