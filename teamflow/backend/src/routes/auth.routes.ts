import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';

const router = Router();

router.get('/me', AuthController.getMe);
router.post('/demo-login', AuthController.demoLogin);
router.get('/demo-users', AuthController.getDemoUsers);

export default router;
