import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  History,
  Filter,
  User as UserIcon,
  FolderKanban,
  CheckSquare,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Code,
} from 'lucide-react';
import { ActivityEvent, Project, User } from '../types';
import { api } from '../lib/api';
import { EmptyState } from '../components/ui/EmptyState';

export const ActivityHistory: React.FC = () => {
  const { showToast } = useOutletContext<{ showToast: (type: any, msg: string) => void }>();

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedActor, setSelectedActor] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedProject) params.append('projectId', selectedProject);
      if (selectedActor) params.append('actorId', selectedActor);
      if (selectedAction) params.append('action', selectedAction);
      params.append('limit', '50');

      const [actRes, projRes, userRes] = await Promise.all([
        api.get<ActivityEvent[]>(`/activity?${params.toString()}`),
        api.get<Project[]>('/projects'),
        api.get<User[]>('/users'),
      ]);

      setEvents(actRes.data || []);
      setProjects(projRes.data || []);
      setUsers(userRes.data || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load activity stream');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [selectedProject, selectedActor, selectedAction]);

  const toggleExpand = (id: string) => {
    setExpandedEventId(expandedEventId === id ? null : id);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('created')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('deleted')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (action.includes('status')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (action.includes('assigned')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Authoritative Audit History</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable system-generated audit events recorded directly by backend services for KaizenTrace.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        {/* Project Filter */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Actor Filter */}
        <select
          value={selectedActor}
          onChange={(e) => setSelectedActor(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">All Actors</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        {/* Action Type Filter */}
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">All Action Types</option>
          <option value="task_created">Task Created</option>
          <option value="task_updated">Task Updated</option>
          <option value="task_status_changed">Task Status Changed</option>
          <option value="task_assigned">Task Assigned</option>
          <option value="task_deleted">Task Deleted</option>
          <option value="project_created">Project Created</option>
          <option value="project_updated">Project Updated</option>
          <option value="project_archived">Project Archived</option>
          <option value="user_role_changed">User Role Changed</option>
          <option value="user_status_changed">User Status Changed</option>
          <option value="comment_added">Comment Added</option>
        </select>

        {(selectedProject || selectedActor || selectedAction) && (
          <button
            onClick={() => {
              setSelectedProject('');
              setSelectedActor('');
              setSelectedAction('');
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Activity Timeline Stream */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading audit history stream...</div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity events recorded"
            description="Perform changes to tasks, projects, or team members to generate audit trails."
          />
        ) : (
          <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6">
            {events.map((event) => {
              const isExpanded = expandedEventId === event.id;
              return (
                <div key={event.id} className="relative group">
                  {/* Timeline Bullet */}
                  <div className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-600 ring-2 ring-indigo-100" />

                  {/* Event Card */}
                  <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-100 rounded-xl p-4 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-xs">{event.actorName}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getActionBadgeColor(
                            event.action
                          )}`}
                        >
                          {event.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-slate-600">
                          on <strong className="text-slate-900">"{event.entityTitle}"</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(event.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Meta tags */}
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
                      {event.projectName && (
                        <span>Project: <strong className="text-slate-700">{event.projectName}</strong></span>
                      )}
                      {event.requestId && (
                        <span className="font-mono text-[10px] text-slate-400">
                          Req: {event.requestId.substring(0, 8)}...
                        </span>
                      )}
                      {(event.before || event.after) && (
                        <button
                          onClick={() => toggleExpand(event.id)}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5 ml-auto"
                        >
                          <span>{isExpanded ? 'Hide Payload Diff' : 'View Payload Diff'}</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      )}
                    </div>

                    {/* Expandable Before/After Diff */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] animate-in fade-in duration-150">
                        {event.before && (
                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <span className="font-semibold text-rose-700 block mb-1">State Before:</span>
                            <pre className="font-mono text-[10px] text-slate-600 overflow-x-auto">
                              {JSON.stringify(event.before, null, 2)}
                            </pre>
                          </div>
                        )}
                        {event.after && (
                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <span className="font-semibold text-emerald-700 block mb-1">State After:</span>
                            <pre className="font-mono text-[10px] text-slate-600 overflow-x-auto">
                              {JSON.stringify(event.after, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
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
