import React from 'react';
import { clsx } from 'clsx';
import { TaskStatus, TaskPriority, ProjectStatus, UserRole } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'slate';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className,
}) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-medium rounded-full border',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};

export const TaskStatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  switch (status) {
    case 'done':
      return <Badge variant="success">Done</Badge>;
    case 'in_progress':
      return <Badge variant="info">In Progress</Badge>;
    case 'in_review':
      return <Badge variant="warning">In Review</Badge>;
    case 'todo':
    default:
      return <Badge variant="slate">To Do</Badge>;
  }
};

export const TaskPriorityBadge: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  switch (priority) {
    case 'urgent':
      return <Badge variant="danger">● Urgent</Badge>;
    case 'high':
      return <Badge variant="warning">● High</Badge>;
    case 'medium':
      return <Badge variant="info">● Medium</Badge>;
    case 'low':
    default:
      return <Badge variant="slate">● Low</Badge>;
  }
};

export const ProjectStatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  switch (status) {
    case 'active':
      return <Badge variant="info">Active</Badge>;
    case 'completed':
      return <Badge variant="success">Completed</Badge>;
    case 'on_hold':
      return <Badge variant="warning">On Hold</Badge>;
    case 'planning':
    default:
      return <Badge variant="purple">Planning</Badge>;
  }
};

export const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  switch (role) {
    case 'admin':
      return <Badge variant="danger">Admin</Badge>;
    case 'project_manager':
      return <Badge variant="purple">Project Manager</Badge>;
    case 'member':
      return <Badge variant="info">Member</Badge>;
    case 'viewer':
    default:
      return <Badge variant="slate">Viewer</Badge>;
  }
};
