import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.routes.js';
import projectRoutes from './project.routes.js';
import taskRoutes from './task.routes.js';
import userRoutes from './user.routes.js';
import activityRoutes from './activity.routes.js';
import notificationRoutes from './notification.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import demoRoutes from './demo.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  res.json({
    status: 'ok',
    service: 'teamflow-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStateNames[dbState] || 'unknown',
      connected: dbState === 1,
    },
  });
});

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/users', userRoutes);
router.use('/activity', activityRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/demo', demoRoutes);

export default router;
