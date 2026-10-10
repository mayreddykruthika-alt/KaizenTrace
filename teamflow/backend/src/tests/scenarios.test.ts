import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { seedDatabase } from '../utils/seedData.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { ActivityEvent } from '../models/ActivityEvent.js';
import { JobRun } from '../models/JobRun.js';
import { Notification } from '../models/Notification.js';
import { DeadlineReminderJob } from '../jobs/deadlineReminderJob.js';
import { env } from '../config/index.js';

let app: any;
let adminUser: any;
let pmUser: any;
let memberUser: any;
let viewerUser: any;
let demoProject: any;
let demoTask: any;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDatabase();
  app = createApp();
});

afterAll(async () => {
  await disconnectDatabase();
});

beforeEach(async () => {
  await seedDatabase(true);

  adminUser = await User.findOne({ role: 'admin' });
  pmUser = await User.findOne({ role: 'project_manager' });
  memberUser = await User.findOne({ role: 'member' });
  viewerUser = await User.findOne({ role: 'viewer' });
  demoProject = await Project.findOne({ isArchived: false });
  demoTask = await Task.findOne({ status: { $ne: 'done' } });
});

describe('TeamFlow Core API Endpoints', () => {
  it('GET /api/health should return ok with database connection status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database.connected).toBe(true);
  });

  it('GET /api/projects should return projects list with calculated progress metrics', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('x-actor-id', adminUser._id.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('progress');
  });

  it('GET /api/dashboard/summary should compute live stats directly from database', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('x-actor-id', adminUser._id.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tasks.total).toBeGreaterThan(0);
    expect(res.body.data.team.activeMembers).toBeGreaterThan(0);
  });
});

describe('KaizenTrace Scenario 1: Permission Regression', () => {
  it('Should reject Viewer updating a task with 403 FORBIDDEN and preserve task state', async () => {
    const originalTitle = demoTask.title;

    const res = await request(app)
      .patch(`/api/tasks/${demoTask._id}`)
      .set('x-actor-id', viewerUser._id.toString())
      .send({ title: 'Hacked by Viewer' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');

    // Confirm task remains completely unchanged in database
    const refreshedTask = await Task.findById(demoTask._id);
    expect(refreshedTask?.title).toBe(originalTitle);
  });

  it('Should reject Viewer creating a project with 403 FORBIDDEN', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('x-actor-id', viewerUser._id.toString())
      .send({
        name: 'Unauthorized Project',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Should permit Admin or Project Manager to update task', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${demoTask._id}`)
      .set('x-actor-id', pmUser._id.toString())
      .send({ priority: 'urgent' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.priority).toBe('urgent');
  });
});

describe('KaizenTrace Scenario 2: Missing Records & Audit Retention', () => {
  it('Should return 404 TASK_NOT_FOUND when requesting a nonexistent task', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .get(`/api/tasks/${fakeId}`)
      .set('x-actor-id', adminUser._id.toString());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    expect(res.body).toHaveProperty('requestId');
  });

  it('Deleting a synthetic task preserves the audit record in activity_events', async () => {
    const taskId = demoTask._id.toString();
    const taskTitle = demoTask.title;

    // Delete task as Admin
    const deleteRes = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('x-actor-id', adminUser._id.toString());

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Confirm task no longer exists
    const missingRes = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('x-actor-id', adminUser._id.toString());

    expect(missingRes.status).toBe(404);
    expect(missingRes.body.error.code).toBe('TASK_NOT_FOUND');

    // Confirm audit event was permanently recorded and persists even after entity deletion
    const auditEvent = await ActivityEvent.findOne({
      entityId: taskId,
      action: 'task_deleted',
    });

    expect(auditEvent).not.toBeNull();
    expect(auditEvent?.entityTitle).toBe(taskTitle);
    expect(auditEvent?.before.title).toBe(taskTitle);
  });
});

describe('KaizenTrace Scenario 3: Failed Background Job & Deduplication', () => {
  it('Background deadline worker handles simulated failure safely and logs failed status', async () => {
    const jobRun = await DeadlineReminderJob.run('test-req-123', true);

    expect(jobRun.status).toBe('failed');
    expect(jobRun.errorSummary).toContain('Simulated network partition');

    const recordedRun = await JobRun.findById(jobRun._id);
    expect(recordedRun?.status).toBe('failed');
  });

  it('Successful background run generates notifications and prevents duplicate within window', async () => {
    // 1. Create a task due tomorrow assigned to memberUser
    const urgentTask = await Task.create({
      title: 'Urgent Security Audit Due Tomorrow',
      projectId: demoProject._id,
      assigneeId: memberUser._id,
      createdBy: adminUser._id,
      status: 'in_progress',
      priority: 'urgent',
      dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // Due in 12 hours
    });

    // 2. Run reminder job
    const firstRun = await DeadlineReminderJob.run('test-req-run-1', false);
    expect(firstRun.status).toBe('completed');
    expect(firstRun.processedCount).toBeGreaterThan(0);

    const initialNotifs = await Notification.countDocuments({
      recipientId: memberUser._id,
      relatedEntityId: urgentTask._id.toString(),
    });
    expect(initialNotifs).toBe(1);

    // 3. Run reminder job again immediately - deduplication window should suppress duplicate
    const secondRun = await DeadlineReminderJob.run('test-req-run-2', false);
    expect(secondRun.status).toBe('completed');

    const subsequentNotifs = await Notification.countDocuments({
      recipientId: memberUser._id,
      relatedEntityId: urgentTask._id.toString(),
    });
    expect(subsequentNotifs).toBe(1); // Still 1, not duplicated!
  });
});

describe('KaizenTrace Scenario 4: Inconsistent Updates & Persistence Failure', () => {
  it('Should reject update with 500 when persistence failure flag is active and prevent false audit', async () => {
    env.TEST_FAIL_TASK_UPDATE = true;

    try {
      const res = await request(app)
        .patch(`/api/tasks/${demoTask._id}`)
        .set('x-actor-id', adminUser._id.toString())
        .send({ status: 'done' });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('DATABASE_ERROR');

      // Verify database state was NOT changed
      const unchangedTask = await Task.findById(demoTask._id);
      expect(unchangedTask?.status).not.toBe('done');
    } finally {
      env.TEST_FAIL_TASK_UPDATE = false;
    }
  });
});
