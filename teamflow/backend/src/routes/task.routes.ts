import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  addCommentSchema,
} from '../utils/schemas.js';

const router = Router();

router.get('/', TaskController.list);
router.post('/', requireRole(['admin', 'project_manager']), validate(createTaskSchema), TaskController.create);
router.get('/:id', TaskController.getById);
router.patch('/:id', requireRole(['admin', 'project_manager', 'member']), validate(updateTaskSchema), TaskController.update);
router.delete('/:id', requireRole(['admin', 'project_manager']), TaskController.delete);
router.patch('/:id/status', requireRole(['admin', 'project_manager', 'member']), validate(updateTaskStatusSchema), TaskController.updateStatus);
router.post('/:id/comments', requireRole(['admin', 'project_manager', 'member']), validate(addCommentSchema), TaskController.addComment);

export default router;
