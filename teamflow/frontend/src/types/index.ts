export type UserRole = 'admin' | 'project_manager' | 'member' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  title?: string;
  department?: string;
  isActive: boolean;
  projectCount?: number;
  taskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  dueDate: string;
  ownerId: User | string;
  memberIds: (User | string)[];
  category: string;
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  totalTasks?: number;
  completedTasks?: number;
  urgentTasks?: number;
  progress?: number;
  metrics?: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    progress: number;
  };
  recentTasks?: Task[];
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string | { id: string; name: string; status: string };
  assigneeId?: User | string;
  createdBy: User | string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string;
  dueDate: string;
  completedAt?: string;
  comments: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export type ActivityAction =
  | 'project_created'
  | 'project_updated'
  | 'project_archived'
  | 'task_created'
  | 'task_updated'
  | 'task_status_changed'
  | 'task_assigned'
  | 'task_deleted'
  | 'user_role_changed'
  | 'user_status_changed'
  | 'comment_added';

export interface ActivityEvent {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail?: string;
  action: ActivityAction;
  entityType: 'project' | 'task' | 'user';
  entityId: string;
  entityTitle: string;
  projectId?: string;
  projectName?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  requestId?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: 'task_assigned' | 'deadline_approaching' | 'task_overdue' | 'task_completed' | 'comment_added';
  message: string;
  relatedEntityType: 'task' | 'project';
  relatedEntityId: string;
  relatedEntityTitle: string;
  readAt?: string;
  createdAt: string;
}

export interface JobRun {
  id: string;
  jobType: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
  processedCount: number;
  failedCount: number;
  errorSummary?: string;
  requestId?: string;
}

export interface DashboardSummary {
  projects: {
    total: number;
    active: number;
    completed: number;
  };
  tasks: {
    total: number;
    completed: number;
    overdue: number;
    completedThisWeek: number;
    completionRate: number;
  };
  team: {
    activeMembers: number;
  };
}

export interface TaskStatusBreakdown {
  byStatus: { status: string; name: string; count: number }[];
  byPriority: { priority: string; name: string; count: number }[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  requestId?: string;
}
