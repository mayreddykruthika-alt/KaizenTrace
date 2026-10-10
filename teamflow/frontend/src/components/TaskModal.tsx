import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Calendar, User as UserIcon, AlertCircle } from 'lucide-react';
import { Task, Project, User, TaskStatus, TaskPriority } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { TaskStatusBadge, TaskPriorityBadge } from './ui/Badge';

interface TaskModalProps {
  isOpen: boolean;
  task?: Task | null;
  projects: Project[];
  users: User[];
  defaultProjectId?: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  task,
  projects,
  users,
  defaultProjectId,
  onClose,
  onSuccess,
  onError,
}) => {
  const { isViewer, currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => {
    if (task) {
      setActiveTask(task);
      setTitle(task.title);
      setDescription(task.description || '');
      const pId = typeof task.projectId === 'string' ? task.projectId : (task.projectId as any)?.id || (task.projectId as any)?._id || '';
      setProjectId(pId);
      const aId = task.assigneeId
        ? typeof task.assigneeId === 'string'
          ? task.assigneeId
          : (task.assigneeId as any).id || (task.assigneeId as any)._id
        : '';
      setAssigneeId(aId);
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    } else {
      setActiveTask(null);
      setTitle('');
      setDescription('');
      setProjectId(defaultProjectId || (projects[0]?.id ?? ''));
      setAssigneeId('');
      setStatus('todo');
      setPriority('medium');
      // Default due date: 7 days from now
      const defaultDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setDueDate(defaultDue);
    }
  }, [task, projects, defaultProjectId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      onError('Task title is required');
      return;
    }
    if (!projectId) {
      onError('Project selection is required');
      return;
    }
    if (!dueDate) {
      onError('Due date is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeTask) {
        // Update task
        await api.patch(`/tasks/${activeTask.id}`, {
          title,
          description,
          assigneeId: assigneeId || null,
          status,
          priority,
          dueDate,
        });
      } else {
        // Create task
        await api.post('/tasks', {
          title,
          description,
          projectId,
          assigneeId: assigneeId || undefined,
          status,
          priority,
          dueDate,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      onError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !activeTask) return;

    try {
      const res = await api.post(`/tasks/${activeTask.id}/comments`, {
        text: newComment.trim(),
      });
      setActiveTask(res.data);
      setNewComment('');
    } catch (err: any) {
      onError(err.message || 'Failed to add comment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {activeTask ? 'Task Details' : 'Create New Task'}
            </h3>
            {activeTask && (
              <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                ID: {activeTask.id}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewer warning alert if applicable */}
        {isViewer && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>
              You are logged in as a <strong>Viewer</strong>. Read-only permissions are enforced by the backend.
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Task Title *
              </label>
              <input
                type="text"
                disabled={isViewer}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement OAuth2 Refresh Token Rotation"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 transition-all font-medium text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Project *
                </label>
                <select
                  disabled={isViewer || Boolean(activeTask)}
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-800 font-medium"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assignee
                </label>
                <select
                  disabled={isViewer}
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-800 font-medium"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  disabled={isViewer}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-800 font-medium"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <select
                  disabled={isViewer}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-800 font-medium"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Due Date *
                </label>
                <input
                  type="date"
                  disabled={isViewer}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-800 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                disabled={isViewer}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Add acceptance criteria, technical context, or dependencies..."
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 text-slate-900 leading-relaxed resize-none"
              />
            </div>
          </form>

          {/* Comments Section (If viewing existing task) */}
          {activeTask && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-indigo-600" />
                <span>Comments & Discussion ({activeTask.comments?.length || 0})</span>
              </h4>

              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {!activeTask.comments || activeTask.comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No comments yet.</p>
                ) : (
                  activeTask.comments.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-3 text-xs">
                      <img
                        src={c.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.userName)}`}
                        alt={c.userName}
                        className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{c.userName}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-700 mt-1 leading-relaxed">{c.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {!isViewer && (
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-xs font-medium flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <Send className="h-3 w-3" />
                    <span>Comment</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          {!isViewer && (
            <button
              type="submit"
              form="task-form"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:bg-indigo-300"
            >
              {isSubmitting ? 'Saving...' : activeTask ? 'Save Changes' : 'Create Task'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
