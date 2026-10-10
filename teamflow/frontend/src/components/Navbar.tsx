import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  UserCheck,
  ChevronDown,
  Check,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';
import { api } from '../lib/api';
import { RoleBadge } from './ui/Badge';

interface NavbarProps {
  title?: string;
  onSearch?: (query: string) => void;
  notifications: Notification[];
  unreadCount: number;
  onRefreshNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title = 'Overview',
  onSearch,
  notifications,
  unreadCount,
  onRefreshNotifications,
}) => {
  const { currentUser, demoUsers, switchUser } = useAuth();
  const navigate = useNavigate();

  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setIsRoleMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setIsNotifMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      onRefreshNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    try {
      if (!notif.readAt) {
        await api.patch(`/notifications/${notif.id}/read`);
        onRefreshNotifications();
      }
      setIsNotifMenuOpen(false);
      if (notif.relatedEntityType === 'project') {
        navigate(`/projects/${notif.relatedEntityId}`);
      } else {
        navigate('/tasks');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Title / Breadcrumb */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h2>
      </div>

      {/* Center / Search */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects, tasks, members..."
            value={searchVal}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right Controls: Notifications & Demo Role Switcher */}
      <div className="flex items-center gap-3">
        {/* Notification Bell Popover */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors relative"
            title="Notifications"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 min-w-[16px] px-1 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center animate-in zoom-in-50">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200/80 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 z-50">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No notifications right now
                  </div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors ${
                        !n.readAt ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">
                          {n.message}
                        </p>
                        {!n.readAt && (
                          <span className="h-2 w-2 rounded-full bg-indigo-600 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                <button
                  onClick={() => {
                    setIsNotifMenuOpen(false);
                    navigate('/notifications');
                  }}
                  className="text-xs font-medium text-slate-600 hover:text-indigo-600 flex items-center justify-center gap-1 w-full py-1"
                >
                  <span>View all notifications</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Demo Role Switcher Dropdown */}
        <div className="relative" ref={roleMenuRef}>
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all text-xs shadow-xs"
          >
            <div className="flex items-center gap-2">
              <img
                src={currentUser?.avatar}
                alt={currentUser?.name}
                className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200"
              />
              <div className="text-left hidden sm:block">
                <div className="font-semibold text-slate-900 leading-none">{currentUser?.name}</div>
                <div className="text-[10px] text-slate-500 capitalize leading-none mt-1">
                  {currentUser?.role.replace('_', ' ')}
                </div>
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
          </button>

          {isRoleMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200/80 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 z-50">
              <div className="p-3 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <Shield className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Switch Demo Persona</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Test role-based permissions instantaneously
                </p>
              </div>

              <div className="p-1 max-h-80 overflow-y-auto space-y-0.5">
                {demoUsers.map((u) => {
                  const isSelected = u.id === currentUser?.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u);
                        setIsRoleMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/80 text-indigo-900 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="h-7 w-7 rounded-full object-cover flex-shrink-0 ring-1 ring-slate-200"
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{u.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{u.title}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <RoleBadge role={u.role} />
                        {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
