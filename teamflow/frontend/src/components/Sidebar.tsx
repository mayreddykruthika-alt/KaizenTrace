import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  History,
  Bell,
  Sliders,
  ShieldCheck,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './ui/Badge';

interface SidebarProps {
  unreadNotificationCount?: number;
  openTaskCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  unreadNotificationCount = 0,
  openTaskCount = 0,
}) => {
  const { currentUser } = useAuth();

  const navItems = [
    { name: 'Overview', to: '/', icon: LayoutDashboard },
    { name: 'Projects', to: '/projects', icon: FolderKanban },
    { name: 'My Tasks', to: '/tasks', icon: CheckSquare, badge: openTaskCount > 0 ? openTaskCount : undefined },
    { name: 'Team Members', to: '/team', icon: Users },
    { name: 'Activity History', to: '/activity', icon: History },
    {
      name: 'Notifications',
      to: '/notifications',
      icon: Bell,
      badge: unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
      badgeColor: 'bg-indigo-600 text-white',
    },
    { name: 'Settings & Scenarios', to: '/settings', icon: Sliders },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              TeamFlow
            </h1>
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>KaizenTrace Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Workspace
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`h-4.5 w-4.5 transition-colors ${
                      isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.badgeColor || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Current Persona Footer */}
      {currentUser && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-all border border-transparent hover:border-slate-200/80 group"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate flex items-center justify-between">
                <span>{currentUser.name}</span>
              </div>
              <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <RoleBadge role={currentUser.role} />
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
          </NavLink>
        </div>
      )}
    </aside>
  );
};
