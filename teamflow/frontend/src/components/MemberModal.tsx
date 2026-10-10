import React, { useState, useEffect } from 'react';
import { X, UserPlus, ShieldAlert } from 'lucide-react';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface MemberModalProps {
  isOpen: boolean;
  user?: User | null;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  user,
  onClose,
  onSuccess,
  onError,
}) => {
  const { canManageTeam } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setTitle(user.title || '');
      setDepartment(user.department || '');
    } else {
      setName('');
      setEmail('');
      setRole('member');
      setTitle('Software Engineer');
      setDepartment('Engineering');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onError('Name is required');
      return;
    }
    if (!user && !email.trim()) {
      onError('Email is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (user) {
        // Update user profile
        await api.patch(`/users/${user.id}`, {
          name,
          title,
          department,
        });

        // If role was modified and current actor is admin
        if (role !== user.role && canManageTeam) {
          await api.patch(`/users/${user.id}/role`, { role });
        }
      } else {
        // Create user
        await api.post('/users', {
          name,
          email,
          role,
          title,
          department,
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {user ? 'Edit Team Member' : 'Add Demo Member'}
              </h3>
              <p className="text-xs text-slate-500">
                {user ? 'Update role & title details' : 'Create a realistic synthetic team collaborator'}
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

        {!canManageTeam && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
            <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>Only Administrators can add team members or alter security roles.</span>
          </div>
        )}

        {/* Form Body */}
        <form id="member-form" onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              disabled={!canManageTeam}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya Lin"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              disabled={Boolean(user) || !canManageTeam}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. maya.lin@teamflow.io"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Role *
              </label>
              <select
                disabled={!canManageTeam}
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-800 font-medium"
              >
                <option value="admin">Admin</option>
                <option value="project_manager">Project Manager</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Department
              </label>
              <input
                type="text"
                disabled={!canManageTeam}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-800 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Job Title
            </label>
            <input
              type="text"
              disabled={!canManageTeam}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 text-slate-900 font-medium"
            />
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
          {canManageTeam && (
            <button
              type="submit"
              form="member-form"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:bg-indigo-300"
            >
              {isSubmitting ? 'Saving...' : user ? 'Save Changes' : 'Add Member'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
