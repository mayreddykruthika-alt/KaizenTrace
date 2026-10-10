import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  Clock,
  Plus,
  FolderKanban,
  Edit2,
  Trash2,
  ListTodo,
  Layers,
  History,
} from 'lucide-react';
import { Project, Task, User } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ProjectStatusBadge, TaskStatusBadge, TaskPriorityBadge } from '../components/ui/Badge';
import { TaskModal } from '../components/TaskModal';
import { ProjectModal } from '../components/ProjectModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{ showToast: (type: any, msg: string) => void }>();
  const { canManageProjects, canManageTasks } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'overview'>('tasks');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const fetchProjectDetails = async () => {
    try {
      setIsLoading(true);
      const [projRes, tasksRes, usersRes] = await Promise.all([
        api.get<Project>(`/projects/${id}`),
        api.get<Task[]>(`/tasks?projectId=${id}`),
        api.get<User[]>('/users'),
      ]);

      setProject(projRes.data || null);
      setTasks(tasksRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load project details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProjectDetails();
    }
  }, [id]);

  const handleDeleteTask = async () => {
    if (!deletingTaskId) return;
    try {
      await api.delete(`/tasks/${deletingTaskId}`);
      showToast('success', 'Task deleted successfully. Audit preserved.');
      setDeletingTaskId(null);
      fetchProjectDetails();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete task');
    }
  };

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-500 text-xs">
        Loading project details...
      </div>
    );
  }

  const owner = typeof project.ownerId === 'object' ? (project.ownerId as User) : null;
  const metrics = project.metrics || {
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === 'done').length,
    inProgressTasks: tasks.filter((t) => t.status === 'in_progress').length,
    todoTasks: tasks.filter((t) => t.status === 'todo').length,
    progress: tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100) : 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Back Button */}
      <button
        onClick={() => navigate('/projects')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Projects</span>
      </button>

      {/* Project Banner Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {project.category}
              </span>
              <ProjectStatusBadge status={project.status} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {project.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
              {project.description}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {canManageProjects && (
              <button
                onClick={() => setIsEditProjectOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Project</span>
              </button>
            )}
            {canManageTasks && (
              <button
                onClick={() => {
                  setSelectedTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Project Meta Details Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] mb-1">Project Lead</span>
            <div className="flex items-center gap-2 font-medium text-slate-900">
              <img
                src={owner?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=lead'}
                alt={owner?.name || 'Lead'}
                className="h-5 w-5 rounded-full object-cover"
              />
              <span>{owner?.name || 'Alex Rivera'}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] mb-1">Timeline Deadline</span>
            <div className="flex items-center gap-1.5 font-medium text-slate-900">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              <span>{new Date(project.dueDate).toLocaleDateString()}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] mb-1">Milestone Progress</span>
            <span className="font-bold text-slate-900">{metrics.progress}% Complete</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] mb-1">Team Collaborators</span>
            <span className="font-semibold text-slate-900">
              {project.memberIds?.length || 0} members assigned
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'tasks'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListTodo className="h-4 w-4" />
          <span>Work Items & Tasks ({tasks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Team & Delivery Details</span>
        </button>
      </div>

      {/* Tab: Tasks */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {tasks.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="No tasks in this project yet"
              description="Create the first task to break down this workstream into manageable deliverable items."
              actionText={canManageTasks ? 'Add First Task' : undefined}
              onAction={() => {
                setSelectedTask(null);
                setIsTaskModalOpen(true);
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((t) => {
                    const assignee = typeof t.assigneeId === 'object' ? (t.assigneeId as User) : null;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => {
                              setSelectedTask(t);
                              setIsTaskModalOpen(true);
                            }}
                            className="font-semibold text-slate-900 group-hover:text-indigo-600 text-left line-clamp-1"
                          >
                            {t.title}
                          </button>
                          {t.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {t.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <TaskStatusBadge status={t.status} />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <TaskPriorityBadge priority={t.priority} />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={assignee.avatar}
                                alt={assignee.name}
                                className="h-5 w-5 rounded-full object-cover"
                              />
                              <span className="font-medium text-slate-700">{assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                          {new Date(t.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedTask(t);
                                setIsTaskModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded text-xs font-medium transition-colors"
                            >
                              Edit
                            </button>
                            {canManageTasks && (
                              <button
                                onClick={() => setDeletingTaskId(t.id)}
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
          )}
        </div>
      )}

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Project Mission & Architecture</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{project.description}</p>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Assigned Team Members ({project.memberIds?.length || 0})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(project.memberIds || []).map((m: any, idx) => (
                  <div key={m.id || idx} className="p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                    <img
                      src={m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${idx}`}
                      alt={m.name || 'Member'}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{m.name}</div>
                      <div className="text-[10px] text-slate-500 capitalize">{m.role?.replace('_', ' ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Delivery Metrics</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Total Work Items</span>
                <span className="font-bold text-slate-900">{metrics.totalTasks}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Completed</span>
                <span className="font-bold text-emerald-600">{metrics.completedTasks}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">In Progress</span>
                <span className="font-bold text-blue-600">{metrics.inProgressTasks}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Backlog / To Do</span>
                <span className="font-bold text-slate-600">{metrics.todoTasks}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        task={selectedTask}
        projects={[project]}
        users={users}
        defaultProjectId={project.id}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSuccess={() => {
          showToast('success', selectedTask ? 'Task updated' : 'Task added');
          fetchProjectDetails();
        }}
        onError={(msg) => showToast('error', msg)}
      />

      {/* Edit Project Modal */}
      <ProjectModal
        isOpen={isEditProjectOpen}
        project={project}
        users={users}
        onClose={() => setIsEditProjectOpen(false)}
        onSuccess={() => {
          showToast('success', 'Project updated successfully');
          fetchProjectDetails();
        }}
        onError={(msg) => showToast('error', msg)}
      />

      {/* Confirm Task Deletion Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingTaskId)}
        title="Delete Task"
        message="Are you sure you want to delete this task? KaizenTrace records an authoritative audit event that persists even after deletion."
        confirmText="Delete Task"
        isDestructive={true}
        onConfirm={handleDeleteTask}
        onCancel={() => setDeletingTaskId(null)}
      />
    </div>
  );
};
