import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller.js';

const router = Router();

router.get('/', ActivityController.list);
router.get('/:id', ActivityController.getById);

export default router;
