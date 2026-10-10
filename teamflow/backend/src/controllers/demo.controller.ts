import { Request, Response, NextFunction } from 'express';
import { DeadlineReminderJob } from '../jobs/deadlineReminderJob.js';
import { JobRun } from '../models/JobRun.js';
import { seedDatabase } from '../utils/seedData.js';
import { logger } from '../logger/index.js';

export class DemoController {
  static async getScenarios(_req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: {
        description: 'Controlled scenarios prepared for KaizenTrace incident investigation and testing.',
        scenarios: [
          {
            id: 'scenario-1-permission-regression',
            title: 'Permission Regression',
            category: 'Authorization & Security',
            description: 'A Viewer attempts to update a task or change its status.',
            expectedBehavior: 'Backend rejects request with 403 FORBIDDEN and logs an authorization warning.',
            triggerCondition: 'Log in as Viewer (jordan.lee@teamflow.io) and send PATCH to /api/tasks/:id',
            faultInjectionFlag: 'TEST_DISABLE_PERMISSIONS (set to true to simulate permission bypass)',
          },
          {
            id: 'scenario-2-missing-records',
            title: 'Missing Records & Audit Retention',
            category: 'Data Integrity',
            description: 'Requesting a nonexistent task returns 404, while previously deleted tasks retain permanent audit logs.',
            expectedBehavior: 'Returns 404 TASK_NOT_FOUND. Deletion audit event remains accessible in /api/activity.',
            triggerCondition: 'Send GET /api/tasks/507f1f77bcf86cd799439011 or delete synthetic task.',
          },
          {
            id: 'scenario-3-failed-background-job',
            title: 'Failed Background Job & Deduplication',
            category: 'Reliability & Workers',
            description: 'Deadline reminder worker runs, dispatches notifications, and safely handles simulated network partition.',
            expectedBehavior: 'Job run recorded with status "failed", error summary stored, server remains healthy, retries avoid duplicate notifications.',
            triggerCondition: 'POST /api/demo/trigger-deadline-job with { "forceFailure": true }',
            faultInjectionFlag: 'TEST_FAIL_DEADLINE_JOB (set to true to cause scheduled job failures)',
          },
          {
            id: 'scenario-4-inconsistent-updates',
            title: 'Inconsistent Updates & Persistence Failure',
            category: 'Consistency & Transactions',
            description: 'Task state update fails before persistence to prevent corrupt audit trail.',
            expectedBehavior: 'Returns 500 DATABASE_ERROR and aborts without recording fake success audit event.',
            triggerCondition: 'Set TEST_FAIL_TASK_UPDATE=true and send PATCH to /api/tasks/:id',
            faultInjectionFlag: 'TEST_FAIL_TASK_UPDATE (set to true to simulate database failure during update)',
          },
        ],
      },
    });
  }

  static async triggerDeadlineJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { forceFailure } = req.body;
      const jobRun = await DeadlineReminderJob.run(req.id, forceFailure === true);

      res.json({
        success: jobRun.status === 'completed',
        data: jobRun,
        message: jobRun.status === 'completed'
          ? `Deadline reminder job completed. Processed ${jobRun.processedCount} tasks.`
          : `Deadline reminder job failed as expected: ${jobRun.errorSummary}`,
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getJobRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const runs = await JobRun.find().sort({ startedAt: -1 }).limit(limit).lean();

      res.json({
        success: true,
        data: runs.map(r => ({ ...r, id: r._id.toString() })),
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }

  static async resetData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.warn({ actor: req.actor?.id, requestId: req.id }, 'Triggered demo data reseed from API');
      await seedDatabase(true);

      res.json({
        success: true,
        message: 'Synthetic demo dataset reset to baseline successfully.',
        requestId: req.id,
      });
    } catch (err) {
      next(err);
    }
  }
}
