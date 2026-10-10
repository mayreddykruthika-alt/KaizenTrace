import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DashboardSummary, TaskStatusBreakdown, ActivityEvent, Project, User } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { StatCardSkeleton, CardSkeleton } from '../components/ui/LoadingSkeleton';
import { TaskModal } from '../components/TaskModal';
import { ProjectModal } from '../components/ProjectModal';

export const Overview: React.FC = () => {
  const { showToast } = useOutletContext<{ showToast: (type: any, msg: string) => void }>();
  const { canManageProjects, canManageTasks } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [taskBreakdown, setTaskBreakdown] = useState<TaskStatusBreakdown | null>(null);
  const [recentEvents, setRecentEvents] = useState<ActivityEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [sumRes, breakRes, actRes, projRes, userRes] = await Promise.all([
        api.get<DashboardSummary>('/dashboard/summary'),
        api.get<TaskStatusBreakdown>('/dashboard/task-status'),
        api.get<ActivityEvent[]>('/dashboard/recent-activity?limit=6'),
        api.get<Project[]>('/projects'),
        api.get<User[]>('/users'),
      ]);

      setSummary(sumRes.data || null);
      setTaskBreakdown(breakRes.data || null);
      setRecentEvents(actRes.data || []);
      setProjects(projRes.data || []);
      setUsers(userRes.data || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    'To Do': '#94a3b8',
    'In Progress': '#3b82f6',
    'In Review': '#f59e0b',
    Done: '#10b981',
  };

  const PRIORITY_COLORS: Record<string, string> = {
    Low: '#94a3b8',
    Medium: '#3b82f6',
    High: '#f97316',
    Urgent: '#ef4444',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Project Management Overview</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time delivery analytics, project statuses, and activity audit events monitored by KaizenTrace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canManageProjects && (
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </button>
          )}
          {canManageTasks && (
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Metrics */}
      {isLoading || !summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active Projects */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Projects
              </span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <FolderKanban className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{summary.projects.active}</span>
              <span className="text-xs text-slate-500">of {summary.projects.total} total</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{summary.projects.completed} completed projects</span>
            </div>
          </div>

          {/* Card 2: Task Completion */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Completion Rate
              </span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {summary.tasks.completionRate}%
              </span>
              <span className="text-xs text-slate-500">
                {summary.tasks.completed}/{summary.tasks.total} tasks
              </span>
            </div>
            <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${summary.tasks.completionRate}%` }}
              />
            </div>
          </div>

          {/* Card 3: Overdue Tasks */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overdue Tasks
              </span>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-600">{summary.tasks.overdue}</span>
              <span className="text-xs text-slate-500">require attention</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>{summary.tasks.completedThisWeek} completed this week</span>
            </div>
          </div>

          {/* Card 4: Team Members */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Team
              </span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{summary.team.activeMembers}</span>
              <span className="text-xs text-slate-500">collaborators</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
              <Link to="/team" className="hover:underline flex items-center gap-1">
                <span>View directory</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Tasks by Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Task Status Distribution</h3>
              <p className="text-xs text-slate-500">Live breakdown of work items across stages</p>
            </div>
            <span className="text-xs font-medium text-slate-400">Total: {summary?.tasks.total || 0}</span>
          </div>

          <div className="h-64 w-full">
            {taskBreakdown && taskBreakdown.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskBreakdown.byStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {taskBreakdown.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading task distribution...
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Priority Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Task Priority Allocation</h3>
              <p className="text-xs text-slate-500">Distribution of workload urgency</p>
            </div>
            <span className="text-xs font-medium text-slate-400">Urgent: {summary?.tasks.overdue || 0}</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {taskBreakdown && taskBreakdown.byPriority.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskBreakdown.byPriority}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="count"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {taskBreakdown.byPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#6366f1'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading priority metrics...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Active Projects Quick List & Recent Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Workstreams</h3>
              <p className="text-xs text-slate-500">Key initiatives currently underway</p>
            </div>
            <Link to="/projects" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <span>View all projects</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {projects.slice(0, 3).map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {p.name}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{p.description}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                    {p.progress || 0}%
                  </span>
                </div>

                <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${p.progress || 0}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Category: {p.category}</span>
                  <span>Due: {new Date(p.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Authoritative Audit Events Feed (1 Col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Audit Stream</h3>
              <p className="text-xs text-slate-500">Live authoritative backend logs</p>
            </div>
            <Link to="/activity" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <span>All history</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {recentEvents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No activity recorded yet</div>
            ) : (
              recentEvents.map((evt) => (
                <div key={evt.id} className="flex items-start gap-3 text-xs">
                  <div className="h-6 w-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-[10px]">
                    {evt.actorName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-medium leading-snug">
                      <span className="font-semibold text-slate-900">{evt.actorName}</span>{' '}
                      <span className="text-slate-500">{evt.action.replace(/_/g, ' ')}</span>{' '}
                      <span className="font-medium text-slate-900">"{evt.entityTitle}"</span>
                    </p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        projects={projects}
        users={users}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => {
          showToast('success', 'Task created successfully');
          fetchDashboardData();
        }}
        onError={(msg) => showToast('error', msg)}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        users={users}
        onClose={() => setIsProjectModalOpen(false)}
        onSuccess={() => {
          showToast('success', 'Project created successfully');
          fetchDashboardData();
        }}
        onError={(msg) => showToast('error', msg)}
      />
    </div>
  );
};
