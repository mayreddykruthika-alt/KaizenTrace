import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FolderKanban,
  Calendar,
  CheckCircle2,
  Users,
  Archive,
  MoreVertical,
  Edit2,
  ArrowRight,
} from 'lucide-react';
import { Project, ProjectStatus, User } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ProjectStatusBadge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ProjectModal } from '../components/ProjectModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const Projects: React.FC = () => {
  const { showToast } = useOutletContext<{ showToast: (type: any, msg: string) => void }>();
  const { canManageProjects } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [archivingProject, setArchivingProject] = useState<Project | null>(null);

  const fetchProjectsAndUsers = async () => {
    try {
      setIsLoading(true);
      const [projRes, userRes] = await Promise.all([
        api.get<Project[]>('/projects'),
        api.get<User[]>('/users'),
      ]);
      setProjects(projRes.data || []);
      setUsers(userRes.data || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndUsers();
  }, []);

  const handleArchive = async () => {
    if (!archivingProject) return;
    try {
      await api.post(`/projects/${archivingProject.id}/archive`);
      showToast('success', `Project "${archivingProject.name}" archived`);
      setArchivingProject(null);
      fetchProjectsAndUsers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to archive project');
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statuses = [
    { label: 'All Projects', value: 'all', count: projects.length },
    { label: 'Active', value: 'active', count: projects.filter((p) => p.status === 'active').length },
    { label: 'Planning', value: 'planning', count: projects.filter((p) => p.status === 'planning').length },
    { label: 'On Hold', value: 'on_hold', count: projects.filter((p) => p.status === 'on_hold').length },
    { label: 'Completed', value: 'completed', count: projects.filter((p) => p.status === 'completed').length },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Projects</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage roadmaps, cross-functional teams, and milestones.
          </p>
        </div>

        {canManageProjects && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => setSelectedStatus(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedStatus === s.value
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{s.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedStatus === s.value ? 'bg-indigo-200/60 text-indigo-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {s.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description={
            searchQuery
              ? `No projects matched "${searchQuery}". Try a different search query.`
              : 'There are no projects in this status category.'
          }
          actionText={canManageProjects ? 'Create First Project' : undefined}
          onAction={canManageProjects ? () => setIsCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col overflow-hidden group"
            >
              <div className="p-6 flex-1 flex flex-col justify-between">
                {/* Top Badge & Category */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {project.category}
                    </span>
                    <ProjectStatusBadge status={project.status} />
                  </div>

                  {/* Title & Description */}
                  <h3
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer line-clamp-1"
                  >
                    {project.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span>Progress</span>
                    <span>{project.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress || 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>{project.completedTasks || 0} of {project.totalTasks || 0} tasks done</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(project.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                {/* Team member avatars */}
                <div className="flex items-center -space-x-1.5 overflow-hidden">
                  {(project.memberIds || []).slice(0, 4).map((member: any, i) => (
                    <img
                      key={member.id || i}
                      src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                      alt={member.name || 'Member'}
                      title={member.name}
                      className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
                    />
                  ))}
                  {(project.memberIds?.length || 0) > 4 && (
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 ring-2 ring-white">
                      +{project.memberIds.length - 4}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {canManageProjects && (
                    <>
                      <button
                        onClick={() => setEditingProject(project)}
                        title="Edit project"
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setArchivingProject(project)}
                        title="Archive project"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Open</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <ProjectModal
        isOpen={isCreateModalOpen}
        users={users}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          showToast('success', 'Project created successfully');
          fetchProjectsAndUsers();
        }}
        onError={(msg) => showToast('error', msg)}
      />

      {/* Edit Project Modal */}
      <ProjectModal
        isOpen={Boolean(editingProject)}
        project={editingProject}
        users={users}
        onClose={() => setEditingProject(null)}
        onSuccess={() => {
          showToast('success', 'Project updated successfully');
          fetchProjectsAndUsers();
        }}
        onError={(msg) => showToast('error', msg)}
      />

      {/* Confirm Archive Dialog */}
      <ConfirmDialog
        isOpen={Boolean(archivingProject)}
        title="Archive Project"
        message={`Are you sure you want to archive "${archivingProject?.name}"? Archived projects can be retrieved in audit logs.`}
        confirmText="Archive Project"
        isDestructive={true}
        onConfirm={handleArchive}
        onCancel={() => setArchivingProject(null)}
      />
    </div>
  );
};
