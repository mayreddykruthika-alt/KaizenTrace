import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Notification } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';

export const Notifications: React.FC = () => {
  const { showToast, refreshNotifications } = useOutletContext<{
    showToast: (type: any, msg: string) => void;
    refreshNotifications: () => void;
  }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ notifications: Notification[]; unreadCount: number }>(
        `/notifications?limit=50${unreadOnly ? '&unreadOnly=true' : ''}`
      );
      setNotifications((res.data as any).notifications || res.data || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [unreadOnly]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      refreshNotifications();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      showToast('success', 'All notifications marked as read');
      fetchNotifs();
      refreshNotifications();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to mark all as read');
    }
  };

  const handleClickItem = (n: Notification) => {
    if (!n.readAt) {
      handleMarkRead(n.id);
    }
    if (n.relatedEntityType === 'project') {
      navigate(`/projects/${n.relatedEntityId}`);
    } else {
      navigate('/tasks');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Notifications</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Assignment alerts, approaching deadlines, and background job notifications for {currentUser?.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              unreadOnly
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {unreadOnly ? 'Showing Unread' : 'Filter Unread'}
          </button>

          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
          >
            <CheckCheck className="h-4 w-4 text-indigo-600" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="All caught up!"
            description="You don't have any unread notifications or deadline reminders right now."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const isUnread = !n.readAt;
              return (
                <div
                  key={n.id}
                  className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                    isUnread ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isUnread ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 leading-snug">
                          {n.message}
                        </span>
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-indigo-600 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                        <span className="capitalize">Category: {n.type.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleClickItem(n)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                    >
                      <span>View</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                    {isUnread && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        title="Mark as read"
                        className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
