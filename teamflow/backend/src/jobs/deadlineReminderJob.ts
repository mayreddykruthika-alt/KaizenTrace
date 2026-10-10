import { v4 as uuidv4 } from 'uuid';
import { Task } from '../models/Task.js';
import { JobRun } from '../models/JobRun.js';
import { NotificationService } from '../services/notificationService.js';
import { logger } from '../logger/index.js';
import { env } from '../config/index.js';

export class DeadlineReminderJob {
  private static timer: NodeJS.Timeout | null = null;

  static async run(requestId = uuidv4(), forceFailure = false): Promise<any> {
    const startedAt = new Date();
    logger.info({
      type: 'JOB_STARTED',
      jobType: 'deadline_reminder',
      requestId,
    }, 'Deadline reminder background job started');

    const jobRun = new JobRun({
      jobType: 'deadline_reminder',
      status: 'running',
      startedAt,
      requestId,
    });
    await jobRun.save();

    let processedCount = 0;
    let failedCount = 0;

    try {
      // Scenario 3 fault injection check
      if (forceFailure || env.TEST_FAIL_DEADLINE_JOB) {
        throw new Error('[FAULT_INJECTION] Simulated network partition / external worker error during deadline processing');
      }

      const now = new Date();
      const in48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Find tasks due within next 48 hours or overdue that are not done
      const tasks = await Task.find({
        status: { $ne: 'done' },
        dueDate: { $lte: in48Hours },
        assigneeId: { $exists: true, $ne: null },
      }).lean();

      for (const task of tasks) {
        try {
          const isOverdue = new Date(task.dueDate) < now;
          const notifType = isOverdue ? 'task_overdue' : 'deadline_approaching';
          const msg = isOverdue
            ? `Urgent: Task "${task.title}" is overdue (was due on ${new Date(task.dueDate).toLocaleDateString()})`
            : `Upcoming deadline: Task "${task.title}" is due soon (${new Date(task.dueDate).toLocaleDateString()})`;

          const created = await NotificationService.createNotification({
            recipientId: task.assigneeId!.toString(),
            type: notifType,
            message: msg,
            relatedEntityType: 'task',
            relatedEntityId: task._id.toString(),
            relatedEntityTitle: task.title,
            preventDuplicateWithinHours: 24, // suppress duplicate notifications within 24h
            requestId,
          });

          if (created) {
            processedCount++;
          }
        } catch (itemErr: any) {
          failedCount++;
          logger.error({
            type: 'JOB_ITEM_FAILED',
            jobType: 'deadline_reminder',
            taskId: task._id.toString(),
            err: itemErr.message,
            requestId,
          }, `Failed processing deadline notification for task ${task._id}`);
        }
      }

      jobRun.status = 'completed';
      jobRun.finishedAt = new Date();
      jobRun.processedCount = processedCount;
      jobRun.failedCount = failedCount;
      await jobRun.save();

      logger.info({
        type: 'JOB_COMPLETED',
        jobType: 'deadline_reminder',
        processedCount,
        failedCount,
        durationMs: Date.now() - startedAt.getTime(),
        requestId,
      }, `Deadline reminder job completed successfully. Processed: ${processedCount}`);

      return jobRun;
    } catch (err: any) {
      jobRun.status = 'failed';
      jobRun.finishedAt = new Date();
      jobRun.processedCount = processedCount;
      jobRun.failedCount = failedCount + 1;
      jobRun.errorSummary = err.message;
      await jobRun.save();

      logger.error({
        type: 'JOB_FAILED',
        jobType: 'deadline_reminder',
        errorMessage: err.message,
        durationMs: Date.now() - startedAt.getTime(),
        requestId,
      }, `Deadline reminder job failed: ${err.message}`);

      return jobRun;
    }
  }

  static startScheduler(intervalMs = 60000): void {
    if (this.timer) {
      clearInterval(this.timer);
    }

    logger.info({ intervalMs }, 'Starting in-process deadline reminder scheduler');
    this.timer = setInterval(async () => {
      try {
        await this.run();
      } catch (e: any) {
        logger.error({ err: e.message }, 'Scheduled deadline job error uncaught');
      }
    }, intervalMs);
  }

  static stopScheduler(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Stopped in-process deadline reminder scheduler');
    }
  }
}
