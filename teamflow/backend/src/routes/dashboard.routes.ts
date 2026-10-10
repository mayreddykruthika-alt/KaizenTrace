import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/summary', DashboardController.getSummary);
router.get('/task-status', DashboardController.getTaskStatus);
router.get('/recent-activity', DashboardController.getRecentActivity);

export default router;
