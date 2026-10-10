import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Shield,
  Edit2,
  CheckCircle,
  XCircle,
  Briefcase,
  CheckSquare,
  Search,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from '../components/ui/Badge';
import { TableRowSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { MemberModal } from '../components/MemberModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const TeamMembers: React.FC = () => {
  const { showToast } = useOutletContext<{ showToast: (type: any, msg: string) => void }>();
  const { canManageTeam, refreshUsers } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [togglingUser, setTogglingUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<User[]>('/users');
      setUsers(res.data || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async () => {
    if (!togglingUser) return;
    try {
      await api.patch(`/users/${togglingUser.id}/active`, {
        isActive: !togglingUser.isActive,
      });
      showToast(
        'success',
        `Member status changed to ${!togglingUser.isActive ? 'active' : 'inactive'}`
      );
      setTogglingUser(null);
      fetchUsers();
      refreshUsers();
    } catch (err: any) {
      showToast('error', err.message || 'Status toggle failed');
    }
  };

  const filteredUsers = users.filter((u) => {
    return (
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.title && u.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Team Members & Access Control</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage users, assign workspace roles, and control active status.
          </p>
        </div>

        {canManageTeam && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Demo Member</span>
          </button>
        )}
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative min-w-[240px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 transition-all placeholder:text-slate-400"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Total Collaborators: <strong>{users.length}</strong>
        </span>
      </div>

      {/* Members Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading team roster...</div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members match search"
            description="Try searching with a different name, email, or department."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-5">Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department & Title</th>
                  <th className="py-3 px-4 text-center">Projects</th>
                  <th className="py-3 px-4 text-center">Active Tasks</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* Avatar & Name */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 block leading-tight">
                            {user.name}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <RoleBadge role={user.role} />
                    </td>

                    {/* Department & Title */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="font-medium text-slate-800 block">{user.title}</span>
                      <span className="text-[11px] text-slate-400 block">{user.department}</span>
                    </td>

                    {/* Projects Count */}
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      {user.projectCount || 0}
                    </td>

                    {/* Active Tasks Count */}
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      {user.taskCount || 0}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="h-3 w-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          <XCircle className="h-3 w-3" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManageTeam && (
                          <>
                            <button
                              onClick={() => setEditingUser(user)}
                              className="px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded text-xs font-medium transition-colors"
                            >
                              Edit / Role
                            </button>
                            <button
                              onClick={() => setTogglingUser(user)}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                user.isActive
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Member Modal (Add & Edit) */}
      <MemberModal
        isOpen={isAddModalOpen || Boolean(editingUser)}
        user={editingUser}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingUser(null);
        }}
        onSuccess={() => {
          showToast('success', editingUser ? 'Member details updated' : 'Member added');
          fetchUsers();
          refreshUsers();
        }}
        onError={(msg) => showToast('error', msg)}
      />

      {/* Confirm Status Toggle Dialog */}
      <ConfirmDialog
        isOpen={Boolean(togglingUser)}
        title={togglingUser?.isActive ? 'Deactivate Team Member' : 'Activate Team Member'}
        message={`Are you sure you want to ${
          togglingUser?.isActive ? 'deactivate' : 'reactivate'
        } ${togglingUser?.name}? An authoritative audit record will be created.`}
        confirmText={togglingUser?.isActive ? 'Deactivate' : 'Activate'}
        isDestructive={togglingUser?.isActive}
        onConfirm={handleToggleActive}
        onCancel={() => setTogglingUser(null)}
      />
    </div>
  );
};
