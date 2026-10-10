import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  Search,
  CheckSquare,
  Columns,
  Table as TableIcon,
  Calendar,
  AlertCircle,
  MoreVertical,
  Trash2,
  Edit2,
  ArrowRight,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Task, Project, User, TaskStatus, TaskPriority } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { TaskStatusBadge, TaskPriorityBadge } from '../components/ui/Badge';
import { TableRowSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { TaskModal } from '../components/TaskModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const MyTasks: React.FC = () => {
  const { showToast } = useOutletContext<{ showToast: (type: any, msg: string) => void }>();
  const { currentUser, canManageTasks, isViewer } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View state: 'table' | 'kanban'
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const fetchTasksData = async () => {
    try {
      setIsLoading(true);
      const [tasksRes, projRes, usersRes] = await Promise.all([
        api.get<Task[]>('/tasks?limit=100'),
        api.get<Project[]>('/projects'),
        api.get<User[]>('/users'),
      ]);
      setTasks(tasksRes.data || []);
      setProjects(projRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksData();
  }, []);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (isViewer) {
      showToast('error', 'Viewers cannot update task status (403 Forbidden)');
      return;
    }

    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      showToast('success', `Task moved to ${newStatus.replace('_', ' ')}`);
    } catch (err: any) {
      showToast('error', err.message || 'Status update failed');
      fetchTasksData(); // revert
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTaskId) return;
    try {
      await api.delete(`/tasks/${deletingTaskId}`);
      showToast('success', 'Task deleted. Permanent audit event created.');
      setDeletingTaskId(null);
      fetchTasksData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete task');
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;

    const aId = t.assigneeId
      ? typeof t.assigneeId === 'string'
        ? t.assigneeId
        : (t.assigneeId as any).id || (t.assigneeId as any)._id
      : 'unassigned';
    const matchesAssignee =
      assigneeFilter === 'all' ||
      (assigneeFilter === 'me' && aId === currentUser?.id) ||
      (assigneeFilter === 'unassigned' && (!t.assigneeId || aId === 'unassigned')) ||
      aId === assigneeFilter;

    const isOverdue = new Date(t.dueDate) < new Date() && t.status !== 'done';
    const matchesOverdue = !overdueOnly || isOverdue;

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesOverdue;
  });

  const KANBAN_COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'todo', title: 'To Do', color: 'border-slate-300' },
    { id: 'in_progress', title: 'In Progress', color: 'border-blue-400' },
    { id: 'in_review', title: 'In Review', color: 'border-amber-400' },
    { id: 'done', title: 'Done', color: 'border-emerald-400' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tasks & Board</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deliverable work tracking across projects with status workflows.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>

          {canManageTasks && (
            <button
              onClick={() => {
                setSelectedTask(null);
                setIsTaskModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks by title or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Assignee */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Assignees</option>
            <option value="me">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Overdue Checkbox Toggle */}
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer text-slate-700 font-medium hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <span>Overdue Only</span>
          </label>
        </div>
      </div>

      {/* Main Content: Kanban vs Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading work items...</div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description="Try adjusting your filters or search terms."
          actionText={canManageTasks ? 'Create New Task' : undefined}
          onAction={() => {
            setSelectedTask(null);
            setIsTaskModalOpen(true);
          }}
        />
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200/60 flex flex-col min-h-[450px]"
              >
                {/* Column Header */}
                <div className={`pb-2.5 mb-3 border-b-2 ${col.color} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{col.title}</span>
                    <span className="text-[10px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Cards in Column */}
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {columnTasks.map((task) => {
                    const assignee = typeof task.assigneeId === 'object' ? (task.assigneeId as User) : null;
                    const project = typeof task.projectId === 'object' ? (task.projectId as any) : null;
                    const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'done';

                    return (
                      <div
                        key={task.id}
                        className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all group"
                      >
                        {/* Project Tag & Priority */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                            {project?.name || 'General'}
                          </span>
                          <TaskPriorityBadge priority={task.priority} />
                        </div>

                        {/* Task Title */}
                        <h4
                          onClick={() => {
                            setSelectedTask(task);
                            setIsTaskModalOpen(true);
                          }}
                          className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer line-clamp-2 leading-snug"
                        >
                          {task.title}
                        </h4>

                        {/* Due Date & Assignee */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <div
                            className={`flex items-center gap-1 font-medium ${
                              isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(task.dueDate).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          {assignee ? (
                            <img
                              src={assignee.avatar}
                              alt={assignee.name}
                              title={`Assigned to ${assignee.name}`}
                              className="h-5 w-5 rounded-full object-cover ring-1 ring-slate-200"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                          )}
                        </div>

                        {/* Quick Column Transition Selector (Instant Move) */}
                        {!isViewer && (
                          <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-medium">Move to:</span>
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                              className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 font-medium focus:outline-none"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="in_review">In Review</option>
                              <option value="done">Done</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => {
                  const assignee = typeof task.assigneeId === 'object' ? (task.assigneeId as User) : null;
                  const project = typeof task.projectId === 'object' ? (task.projectId as any) : null;
                  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'done';

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setIsTaskModalOpen(true);
                          }}
                          className="font-semibold text-slate-900 group-hover:text-indigo-600 text-left line-clamp-1"
                        >
                          {task.title}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {project?.name || 'General'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <TaskStatusBadge status={task.status} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <TaskPriorityBadge priority={task.priority} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={assignee.avatar}
                              alt={assignee.name}
                              className="h-5 w-5 rounded-full object-cover ring-1 ring-slate-200"
                            />
                            <span className="font-medium text-slate-700">{assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'
                          }`}
                        >
                          {new Date(task.dueDate).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setIsTaskModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded text-xs font-medium transition-colors"
                          >
                            Details
                          </button>
                          {canManageTasks && (
                            <button
                              onClick={() => setDeletingTaskId(task.id)}
                              title="Delete Task"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Modal (Create & Edit) */}
      <TaskModal
        isOpen={isTaskModalOpen}
        task={selectedTask}
        projects={projects}
        users={users}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSuccess={() => {
          showToast('success', selectedTask ? 'Task updated' : 'Task created');
          fetchTasksData();
        }}
        onError={(msg) => showToast('error', msg)}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingTaskId)}
        title="Delete Task"
        message="Are you sure you want to delete this task? The authoritative audit event will be preserved for KaizenTrace incident investigation."
        confirmText="Delete Task"
        isDestructive={true}
        onConfirm={handleDeleteTask}
        onCancel={() => setDeletingTaskId(null)}
      />
    </div>
  );
};
