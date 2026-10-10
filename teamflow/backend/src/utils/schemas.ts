import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
    description: z.string().optional(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed']).optional(),
    startDate: z.string().optional(),
    dueDate: z.string().min(1, 'Due date is required'),
    memberIds: z.array(z.string()).optional(),
    category: z.string().optional(),
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed']).optional(),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
    memberIds: z.array(z.string()).optional(),
    category: z.string().optional(),
  }),
});

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Task title must be at least 2 characters').max(120),
    description: z.string().optional(),
    projectId: z.string().min(1, 'Project ID is required'),
    assigneeId: z.string().optional(),
    status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    startDate: z.string().optional(),
    dueDate: z.string().min(1, 'Due date is required'),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(120).optional(),
    description: z.string().optional(),
    assigneeId: z.string().nullable().optional(),
    status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
  }),
});

export const updateTaskStatusSchema = z.object({
  body: z.object({
    status: z.enum(['todo', 'in_progress', 'in_review', 'done']),
  }),
});

export const addCommentSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Comment text cannot be empty').max(1000),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(60),
    email: z.string().email('Invalid email address'),
    role: z.enum(['admin', 'project_manager', 'member', 'viewer']),
    title: z.string().optional(),
    department: z.string().optional(),
    avatar: z.string().optional(),
  }),
});

export const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.enum(['admin', 'project_manager', 'member', 'viewer']),
  }),
});

export const toggleUserStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
});
