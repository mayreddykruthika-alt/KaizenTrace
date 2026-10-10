import { Router } from 'express';
import { DemoController } from '../controllers/demo.controller.js';

const router = Router();

router.get('/scenarios', DemoController.getScenarios);
router.post('/trigger-deadline-job', DemoController.triggerDeadlineJob);
router.get('/job-runs', DemoController.getJobRuns);
router.post('/reset-data', DemoController.resetData);

export default router;
