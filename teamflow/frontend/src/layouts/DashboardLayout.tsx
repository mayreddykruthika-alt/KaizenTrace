import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { Toast, ToastMessage } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';
import { api } from '../lib/api';

export const DashboardLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const fetchNotifications = async () => {
    try {
      if (!currentUser) return;
      const res = await api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications?limit=10');
      if (res.data) {
        setNotifications((res.data as any).notifications || res.data || []);
        setUnreadCount((res.data as any).unreadCount || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // 15s refresh
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Page titles by path
  const getPageTitle = (path: string) => {
    if (path === '/') return 'Workspace Overview';
    if (path.startsWith('/projects/')) return 'Project Details';
    if (path.startsWith('/projects')) return 'Projects Directory';
    if (path.startsWith('/tasks')) return 'My Tasks & Kanban';
    if (path.startsWith('/team')) return 'Team & Access Control';
    if (path.startsWith('/activity')) return 'Authoritative Audit History';
    if (path.startsWith('/notifications')) return 'Notification Center';
    if (path.startsWith('/settings')) return 'Settings & Incident Scenarios';
    return 'TeamFlow';
  };

  const showToast = (type: 'success' | 'error' | 'info', message: string, title?: string) => {
    const id = Date.now().toString();
    setToast({ id, type, message, title });
    setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 4000);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <Sidebar unreadNotificationCount={unreadCount} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          title={getPageTitle(location.pathname)}
          notifications={notifications}
          unreadCount={unreadCount}
          onRefreshNotifications={fetchNotifications}
        />

        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ showToast, refreshNotifications: fetchNotifications }} />
        </main>
      </div>

      {/* Global Toast */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};
