import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createProjectSchema, updateProjectSchema } from '../utils/schemas.js';

const router = Router();

router.get('/', ProjectController.list);
router.post('/', requireRole(['admin', 'project_manager']), validate(createProjectSchema), ProjectController.create);
router.get('/:id', ProjectController.getById);
router.patch('/:id', requireRole(['admin', 'project_manager']), validate(updateProjectSchema), ProjectController.update);
router.post('/:id/archive', requireRole(['admin', 'project_manager']), ProjectController.archive);

export default router;
