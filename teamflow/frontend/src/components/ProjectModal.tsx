import React, { useState, useEffect } from 'react';
import { X, Folder, AlertCircle } from 'lucide-react';
import { Project, User, ProjectStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface ProjectModalProps {
  isOpen: boolean;
  project?: Project | null;
  users: User[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  project,
  users,
  onClose,
  onSuccess,
  onError,
}) => {
  const { canManageProjects, isViewer } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('planning');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setCategory(project.category || 'Product Development');
      setStatus(project.status);
      setStartDate(project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '');
      setDueDate(project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : '');
      const memberIds = (project.memberIds || []).map((m: any) =>
        typeof m === 'string' ? m : m.id || m._id
      );
      setSelectedMemberIds(memberIds);
    } else {
      setName('');
      setDescription('');
      setCategory('Cloud & Architecture');
      setStatus('planning');
      const today = new Date().toISOString().split('T')[0];
      const monthAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(today);
      setDueDate(monthAhead);
      setSelectedMemberIds([]);
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const toggleMember = (userId: string) => {
    if (isViewer) return;
    if (selectedMemberIds.includes(userId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== userId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onError('Project name is required');
      return;
    }
    if (!dueDate) {
      onError('Due date is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (project) {
        await api.patch(`/projects/${project.id}`, {
          name,
          description,
          category,
          status,
          startDate,
          dueDate,
          memberIds: selectedMemberIds,
        });
      } else {
        await api.post('/projects', {
          name,
          description,
          category,
          status,
          startDate,
          dueDate,
          memberIds: selectedMemberIds,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {project ? 'Edit Project' : 'Create New Project'}
              </h3>
              <p className="text-xs text-slate-500">
                {project ? 'Update project scope, roadmap, or team assignments' : 'Initialize a high-impact team initiative'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!canManageProjects && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>
              Your current role does not have permission to manage projects. Backend RBAC is active.
            </span>
          </div>
        )}

        {/* Form Body */}
        <form id="project-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Project Name *
            </label>
            <input
              type="text"
              disabled={!canManageProjects}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Distributed Consensus Engine"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <input
                type="text"
                disabled={!canManageProjects}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Core Infrastructure"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                disabled={!canManageProjects}
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-800 font-medium"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                disabled={!canManageProjects}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Due Date *
              </label>
              <input
                type="date"
                disabled={!canManageProjects}
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
              disabled={!canManageProjects}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Strategic overview, architecture milestones, and team objectives..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-900 resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Assigned Team Members ({selectedMemberIds.length})
            </label>
            <div className="border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1 bg-slate-50/50">
              {users.map((u) => {
                const isSelected = selectedMemberIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleMember(u.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-semibold'
                        : 'hover:bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                      <span>{u.name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">({u.role.replace('_', ' ')})</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      disabled={!canManageProjects}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          {canManageProjects && (
            <button
              type="submit"
              form="project-form"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:bg-indigo-300"
            >
              {isSubmitting ? 'Saving...' : project ? 'Save Changes' : 'Create Project'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
