import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { User, IUser } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { ActivityEvent } from '../models/ActivityEvent.js';
import { Notification } from '../models/Notification.js';
import { JobRun } from '../models/JobRun.js';
import { logger } from '../logger/index.js';

export async function seedDatabase(clearFirst = true): Promise<void> {
  logger.info({ clearFirst }, 'Starting database seeding...');

  if (clearFirst) {
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({}),
      ActivityEvent.deleteMany({}),
      Notification.deleteMany({}),
      JobRun.deleteMany({}),
    ]);
    logger.info('Purged existing records for clean repeatable seeding');
  }

  // 1. Seed Users
  const usersData = [
    {
      name: 'Alex Rivera',
      email: 'alex.rivera@teamflow.io',
      role: 'admin',
      title: 'Head of Engineering',
      department: 'Leadership',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isActive: true,
    },
    {
      name: 'Sarah Chen',
      email: 'sarah.chen@teamflow.io',
      role: 'project_manager',
      title: 'Senior Technical PM',
      department: 'Product',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      isActive: true,
    },
    {
      name: 'Marcus Vance',
      email: 'marcus.vance@teamflow.io',
      role: 'project_manager',
      title: 'Infrastructure PM',
      department: 'Operations',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      isActive: true,
    },
    {
      name: 'Elena Rostova',
      email: 'elena.rostova@teamflow.io',
      role: 'member',
      title: 'Staff Frontend Engineer',
      department: 'Engineering',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      isActive: true,
    },
    {
      name: 'David Kim',
      email: 'david.kim@teamflow.io',
      role: 'member',
      title: 'Full Stack Engineer',
      department: 'Engineering',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      isActive: true,
    },
    {
      name: 'Priya Patel',
      email: 'priya.patel@teamflow.io',
      role: 'member',
      title: 'Senior QA & Reliability Engineer',
      department: 'Quality Engineering',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      isActive: true,
    },
    {
      name: 'Jordan Lee',
      email: 'jordan.lee@teamflow.io',
      role: 'viewer',
      title: 'External Stakeholder & Auditor',
      department: 'Compliance',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      isActive: true,
    },
  ];

  const createdUsers = await User.create(usersData);
  const [adminUser, pmUser1, pmUser2, elenaUser, davidUser, priyaUser, viewerUser] = createdUsers;

  logger.info({ userCount: createdUsers.length }, 'Users seeded successfully');

  // 2. Seed Projects
  const now = new Date();
  const pastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const projectsData = [
    {
      name: 'NextGen Cloud Architecture & Microservices',
      description: 'Migrating legacy monolithic services into distributed containerized microservices on Kubernetes with automated canary deployment.',
      status: 'active',
      startDate: pastWeek,
      dueDate: nextMonth,
      ownerId: pmUser1._id,
      memberIds: [pmUser1._id, adminUser._id, elenaUser._id, davidUser._id, priyaUser._id],
      category: 'Cloud Infrastructure',
      isArchived: false,
    },
    {
      name: 'Enterprise Audit Trail & Security Hardening',
      description: 'End-to-end security compliance, immutable audit log pipelines, role-based access validation, and SOC2 readiness.',
      status: 'active',
      startDate: pastWeek,
      dueDate: nextWeek,
      ownerId: adminUser._id,
      memberIds: [adminUser._id, pmUser2._id, davidUser._id, priyaUser._id, viewerUser._id],
      category: 'Security & Compliance',
      isArchived: false,
    },
    {
      name: 'Mobile SDK 3.0 Real-time Sync',
      description: 'Modern offline-first sync engine for iOS and Android native applications using WebSocket streaming.',
      status: 'planning',
      startDate: now,
      dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      ownerId: pmUser2._id,
      memberIds: [pmUser2._id, elenaUser._id, davidUser._id],
      category: 'Mobile Platform',
      isArchived: false,
    },
    {
      name: 'Design System & Component Library v2',
      description: 'Unifying design tokens, accessible components, and WCAG AA compliance across desktop and web applications.',
      status: 'completed',
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      dueDate: pastWeek,
      ownerId: pmUser1._id,
      memberIds: [pmUser1._id, elenaUser._id],
      category: 'Design Systems',
      isArchived: false,
    },
  ];

  const createdProjects = await Project.create(projectsData);
  const [projCloud, projSecurity, projMobile, projDesign] = createdProjects;

  logger.info({ projectCount: createdProjects.length }, 'Projects seeded successfully');

  // 3. Seed Tasks (18 realistic tasks with mixed priorities, statuses, and deadlines)
  const tasksData = [
    // Project 1: Cloud Architecture
    {
      title: 'Architect Kubernetes ingress and SSL termination',
      description: 'Configure Traefik ingress controller with automated Let’s Encrypt cert-manager on the production cluster.',
      projectId: projCloud._id,
      assigneeId: davidUser._id,
      createdBy: pmUser1._id,
      status: 'done',
      priority: 'high',
      startDate: pastWeek,
      dueDate: yesterday,
      completedAt: yesterday,
      comments: [
        {
          id: uuidv4(),
          userId: davidUser._id,
          userName: davidUser.name,
          userAvatar: davidUser.avatar,
          text: 'Ingress configuration is verified in staging cluster.',
          createdAt: yesterday,
        },
      ],
    },
    {
      title: 'Implement container image signing with Cosign',
      description: 'Integrate Sigstore Cosign in GitHub Actions pipeline to sign container images before push to registry.',
      projectId: projCloud._id,
      assigneeId: priyaUser._id,
      createdBy: pmUser1._id,
      status: 'in_progress',
      priority: 'urgent',
      startDate: pastWeek,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // In 2 days
      comments: [],
    },
    {
      title: 'Optimize Redis cache cluster eviction policy',
      description: 'Tune maxmemory-policy to volatile-lru and implement distributed locking fallback for concurrent workers.',
      projectId: projCloud._id,
      assigneeId: davidUser._id,
      createdBy: pmUser1._id,
      status: 'in_review',
      priority: 'medium',
      startDate: pastWeek,
      dueDate: nextWeek,
      comments: [],
    },
    {
      title: 'Establish Prometheus alerts for pod crashloop backoffs',
      description: 'Set up Alertmanager alerts routing to incident management channel when error rate exceeds 1%.',
      projectId: projCloud._id,
      assigneeId: elenaUser._id,
      createdBy: pmUser1._id,
      status: 'todo',
      priority: 'high',
      startDate: now,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      comments: [],
    },
    {
      title: 'Benchmark gRPC inter-service latency',
      description: 'Run load tests to verify latency stays below 15ms p99 under 5000 requests per second.',
      projectId: projCloud._id,
      assigneeId: undefined, // Unassigned task
      createdBy: pmUser1._id,
      status: 'todo',
      priority: 'low',
      startDate: now,
      dueDate: nextMonth,
      comments: [],
    },

    // Project 2: Security & Audit
    {
      title: 'Resolve critical CVEs in base Docker images',
      description: 'Update Node.js alpine base images to patch OpenSSL vulnerabilities identified in security scan.',
      projectId: projSecurity._id,
      assigneeId: davidUser._id,
      createdBy: adminUser._id,
      status: 'in_progress',
      priority: 'urgent',
      startDate: pastWeek,
      dueDate: yesterday, // Overdue task!
      comments: [
        {
          id: uuidv4(),
          userId: adminUser._id,
          userName: adminUser.name,
          userAvatar: adminUser.avatar,
          text: 'Flagged by automated vulnerability scanner. Please prioritize this patch.',
          createdAt: yesterday,
        },
      ],
    },
    {
      title: 'Enforce MFA for all team workspace access',
      description: 'Enforce TOTP and WebAuthn multi-factor authentication for administrative accounts.',
      projectId: projSecurity._id,
      assigneeId: adminUser._id,
      createdBy: adminUser._id,
      status: 'done',
      priority: 'high',
      startDate: pastWeek,
      dueDate: pastWeek,
      completedAt: pastWeek,
      comments: [],
    },
    {
      title: 'Audit log retention pipeline in cold storage',
      description: 'Stream structured JSON logs from Pino into S3 glacier-backed bucket with SHA-256 integrity verification.',
      projectId: projSecurity._id,
      assigneeId: priyaUser._id,
      createdBy: adminUser._id,
      status: 'in_review',
      priority: 'high',
      startDate: pastWeek,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours!
      comments: [],
    },
    {
      title: 'Penetration testing on public REST endpoints',
      description: 'Validate authorization boundaries on all /api endpoints against IDOR and injection attacks.',
      projectId: projSecurity._id,
      assigneeId: priyaUser._id,
      createdBy: adminUser._id,
      status: 'todo',
      priority: 'urgent',
      startDate: now,
      dueDate: nextWeek,
      comments: [],
    },

    // Project 3: Mobile Platform
    {
      title: 'Draft WebSocket reconnect exponential backoff spec',
      description: 'Define protocol for offline message queue reconciliation and jitter algorithm.',
      projectId: projMobile._id,
      assigneeId: elenaUser._id,
      createdBy: pmUser2._id,
      status: 'in_progress',
      priority: 'medium',
      startDate: pastWeek,
      dueDate: nextWeek,
      comments: [],
    },
    {
      title: 'Design SQLite local persistence schema for iOS client',
      description: 'Create migration scripts and index strategy for offline entity store.',
      projectId: projMobile._id,
      assigneeId: davidUser._id,
      createdBy: pmUser2._id,
      status: 'todo',
      priority: 'medium',
      startDate: now,
      dueDate: nextMonth,
      comments: [],
    },
    {
      title: 'Create push notification delivery telemetry',
      description: 'Capture APNs and FCM delivery acknowledgements for analytics.',
      projectId: projMobile._id,
      assigneeId: undefined, // Unassigned
      createdBy: pmUser2._id,
      status: 'todo',
      priority: 'low',
      startDate: now,
      dueDate: nextMonth,
      comments: [],
    },

    // Project 4: Design System
    {
      title: 'Finalize accessible color contrast palette',
      description: 'Verify 4.5:1 minimum contrast ratio for text on all light and dark theme backgrounds.',
      projectId: projDesign._id,
      assigneeId: elenaUser._id,
      createdBy: pmUser1._id,
      status: 'done',
      priority: 'high',
      startDate: pastWeek,
      dueDate: pastWeek,
      completedAt: pastWeek,
      comments: [],
    },
    {
      title: 'Publish React component library npm package v2.0.0',
      description: 'Generate TypeScript definitions, build ESM/CJS bundles, and verify Storybook documentation.',
      projectId: projDesign._id,
      assigneeId: elenaUser._id,
      createdBy: pmUser1._id,
      status: 'done',
      priority: 'urgent',
      startDate: pastWeek,
      dueDate: pastWeek,
      completedAt: pastWeek,
      comments: [],
    },
    {
      title: 'Conduct screen-reader audit for interactive modals',
      description: 'Test keyboard trap, aria-labelledby, and focus management with NVDA and VoiceOver.',
      projectId: projDesign._id,
      assigneeId: priyaUser._id,
      createdBy: pmUser1._id,
      status: 'done',
      priority: 'medium',
      startDate: pastWeek,
      dueDate: pastWeek,
      completedAt: pastWeek,
      comments: [],
    },
  ];

  const createdTasks = await Task.create(tasksData);
  logger.info({ taskCount: createdTasks.length }, 'Tasks seeded successfully');

  // 4. Seed Activity Events (authoritative chronological audit trail)
  const eventsData = [
    {
      actorId: adminUser._id,
      actorName: adminUser.name,
      actorEmail: adminUser.email,
      action: 'project_created',
      entityType: 'project',
      entityId: projSecurity._id.toString(),
      entityTitle: projSecurity.name,
      projectId: projSecurity._id,
      projectName: projSecurity.name,
      after: { name: projSecurity.name, status: projSecurity.status },
      requestId: uuidv4(),
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    },
    {
      actorId: pmUser1._id,
      actorName: pmUser1.name,
      actorEmail: pmUser1.email,
      action: 'project_created',
      entityType: 'project',
      entityId: projCloud._id.toString(),
      entityTitle: projCloud.name,
      projectId: projCloud._id,
      projectName: projCloud.name,
      after: { name: projCloud.name, status: projCloud.status },
      requestId: uuidv4(),
      createdAt: new Date(Date.now() - 40 * 60 * 60 * 1000),
    },
    {
      actorId: pmUser1._id,
      actorName: pmUser1.name,
      actorEmail: pmUser1.email,
      action: 'task_assigned',
      entityType: 'task',
      entityId: createdTasks[0]._id.toString(),
      entityTitle: createdTasks[0].title,
      projectId: projCloud._id,
      projectName: projCloud.name,
      before: { assigneeId: null },
      after: { assigneeId: davidUser._id.toString() },
      requestId: uuidv4(),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      actorId: davidUser._id,
      actorName: davidUser.name,
      actorEmail: davidUser.email,
      action: 'task_status_changed',
      entityType: 'task',
      entityId: createdTasks[0]._id.toString(),
      entityTitle: createdTasks[0].title,
      projectId: projCloud._id,
      projectName: projCloud.name,
      before: { status: 'in_progress' },
      after: { status: 'done' },
      requestId: uuidv4(),
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    {
      actorId: adminUser._id,
      actorName: adminUser.name,
      actorEmail: adminUser.email,
      action: 'task_created',
      entityType: 'task',
      entityId: createdTasks[5]._id.toString(),
      entityTitle: createdTasks[5].title,
      projectId: projSecurity._id,
      projectName: projSecurity.name,
      after: { title: createdTasks[5].title, priority: 'urgent' },
      requestId: uuidv4(),
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
  ];

  await ActivityEvent.create(eventsData);
  logger.info({ eventCount: eventsData.length }, 'Activity events seeded successfully');

  // 5. Seed Notifications
  const notifsData = [
    {
      recipientId: davidUser._id,
      type: 'task_assigned',
      message: 'Alex Rivera assigned you to task "Resolve critical CVEs in base Docker images"',
      relatedEntityType: 'task',
      relatedEntityId: createdTasks[5]._id.toString(),
      relatedEntityTitle: createdTasks[5].title,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
      recipientId: davidUser._id,
      type: 'task_overdue',
      message: 'Urgent: Task "Resolve critical CVEs in base Docker images" is overdue',
      relatedEntityType: 'task',
      relatedEntityId: createdTasks[5]._id.toString(),
      relatedEntityTitle: createdTasks[5].title,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      recipientId: priyaUser._id,
      type: 'deadline_approaching',
      message: 'Upcoming deadline: Task "Audit log retention pipeline in cold storage" is due in 24 hours',
      relatedEntityType: 'task',
      relatedEntityId: createdTasks[7]._id.toString(),
      relatedEntityTitle: createdTasks[7].title,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    {
      recipientId: adminUser._id,
      type: 'task_completed',
      message: 'Elena Rostova marked task "Publish React component library npm package v2.0.0" as completed',
      relatedEntityType: 'task',
      relatedEntityId: createdTasks[13]._id.toString(),
      relatedEntityTitle: createdTasks[13].title,
      readAt: new Date(Date.now() - 30 * 60 * 1000),
      createdAt: new Date(Date.now() - 45 * 60 * 1000),
    },
  ];

  await Notification.create(notifsData);
  logger.info({ notificationCount: notifsData.length }, 'Notifications seeded successfully');

  // 6. Seed JobRun baseline
  await JobRun.create({
    jobType: 'deadline_reminder',
    status: 'completed',
    startedAt: new Date(Date.now() - 60 * 60 * 1000),
    finishedAt: new Date(Date.now() - 59 * 60 * 1000),
    processedCount: 2,
    failedCount: 0,
    requestId: uuidv4(),
  });

  logger.info('Database seeding completed successfully!');
}
