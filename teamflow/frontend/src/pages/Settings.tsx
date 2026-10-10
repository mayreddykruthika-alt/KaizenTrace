import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Sliders,
  Shield,
  Play,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Activity,
  User as UserIcon,
  Server,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { JobRun } from '../types';
import { api } from '../lib/api';
import { RoleBadge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const Settings: React.FC = () => {
  const { showToast } = useOutletContext<{ showToast: (type: any, msg: string) => void }>();
  const { currentUser, demoUsers, switchUser, refreshUsers } = useAuth();

  const [jobRuns, setJobRuns] = useState<JobRun[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [isRunningJob, setIsRunningJob] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const fetchJobRunsAndScenarios = async () => {
    try {
      const [runsRes, scenRes] = await Promise.all([
        api.get<JobRun[]>('/demo/job-runs'),
        api.get<any>('/demo/scenarios'),
      ]);
      setJobRuns(runsRes.data || []);
      setScenarios((scenRes.data as any)?.scenarios || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchJobRunsAndScenarios();
  }, []);

  const handleRunDeadlineJob = async (forceFailure = false) => {
    setIsRunningJob(true);
    try {
      const res = await api.post('/demo/trigger-deadline-job', { forceFailure });
      if (forceFailure) {
        showToast(
          'info',
          `Controlled failure injected! JobRun recorded as failed: ${res.data?.errorSummary}`
        );
      } else {
        showToast('success', res.message || 'Deadline reminder worker completed');
      }
      fetchJobRunsAndScenarios();
    } catch (err: any) {
      showToast('error', err.message || 'Worker run failed');
    } finally {
      setIsRunningJob(false);
    }
  };

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await api.post('/demo/reset-data');
      showToast('success', 'Synthetic demo dataset safely reset to baseline state.');
      setIsResetConfirmOpen(false);
      fetchJobRunsAndScenarios();
      refreshUsers();
    } catch (err: any) {
      showToast('error', err.message || 'Reset failed');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          System Settings & KaizenTrace Scenarios
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review demo persona credentials, inspect KaizenTrace testing scenarios, and trigger observability controls.
        </p>
      </div>

      {/* Active Persona Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-indigo-600" />
          <span>Active Demo Persona</span>
        </h3>

        {currentUser && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3.5">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-xs"
              />
              <div>
                <h4 className="text-sm font-bold text-slate-900">{currentUser.name}</h4>
                <p className="text-xs text-slate-500">{currentUser.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <RoleBadge role={currentUser.role} />
                  <span className="text-[11px] text-slate-400">• {currentUser.title}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 max-w-xs">
              <span className="font-semibold text-slate-700 block mb-0.5">Permissions Gate:</span>
              {currentUser.role === 'admin' && 'Full administrator rights: can manage projects, tasks, team roles, and settings.'}
              {currentUser.role === 'project_manager' && 'Project manager rights: can create & assign tasks within authorized projects.'}
              {currentUser.role === 'member' && 'Standard member rights: can update assigned task status and add comments.'}
              {currentUser.role === 'viewer' && 'Viewer read-only: API rejects modifications with 403 Forbidden (Scenario 1).'}
            </div>
          </div>
        )}

        {/* Quick Switch Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-700 block mb-2">Switch Active Persona:</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {demoUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => switchUser(u)}
                className={`p-2 rounded-xl text-left border text-xs transition-all flex items-center gap-2 ${
                  u.id === currentUser?.id
                    ? 'border-indigo-600 bg-indigo-50/60 font-bold text-indigo-950 ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <img src={u.avatar} alt={u.name} className="h-6 w-6 rounded-full object-cover" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{u.name.split(' ')[0]}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{u.role.replace('_', ' ')}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KaizenTrace Incident Scenarios Explorer */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-indigo-600" />
              <span>KaizenTrace Controlled Incident Scenarios</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              TeamFlow is instrumented with correlation request IDs, structured logs, and fault injection for the 4 core testing scenarios.
            </p>
          </div>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>

        {/* 4 Scenario Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Scenario 1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                Scenario 1
              </span>
              <span className="text-[11px] font-semibold text-slate-500">Security & RBAC</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Permission Regression</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              When logged in as a <strong>Viewer (Jordan Lee)</strong>, attempting to update task status returns a <strong>403 FORBIDDEN</strong> and logs an authorization warning.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 font-mono bg-white p-2 rounded border border-slate-200/80">
              Verify: Switch to Viewer, open any task, attempt edit.
            </div>
          </div>

          {/* Scenario 2 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                Scenario 2
              </span>
              <span className="text-[11px] font-semibold text-slate-500">Audit & Integrity</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Missing Records & Audit Retention</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Querying nonexistent tasks returns <strong>404 TASK_NOT_FOUND</strong>. Deleting a task permanently preserves its before-snapshot in <strong>activity_events</strong>.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 font-mono bg-white p-2 rounded border border-slate-200/80">
              Verify: Delete a synthetic task, check Activity History.
            </div>
          </div>

          {/* Scenario 3 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                Scenario 3
              </span>
              <span className="text-[11px] font-semibold text-slate-500">Worker Reliability</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Background Worker Failure & Retries</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              The deadline reminder worker detects tasks due in 48h, generates in-app notifications, suppresses duplicate reminders, and safely logs injected failures.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => handleRunDeadlineJob(false)}
                disabled={isRunningJob}
                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 flex items-center gap-1"
              >
                <Play className="h-3 w-3" />
                <span>Run Worker</span>
              </button>
              <button
                onClick={() => handleRunDeadlineJob(true)}
                disabled={isRunningJob}
                className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 flex items-center gap-1"
              >
                <AlertTriangle className="h-3 w-3" />
                <span>Simulate Worker Failure</span>
              </button>
            </div>
          </div>

          {/* Scenario 4 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                Scenario 4
              </span>
              <span className="text-[11px] font-semibold text-slate-500">Consistency</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Inconsistent Updates & Persistence</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Task updates and activity audit events maintain strict integrity. If database persistence fails, the API returns <strong>500 DATABASE_ERROR</strong> and avoids false audits.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 font-mono bg-white p-2 rounded border border-slate-200/80">
              Verify: Tested automatically in Vitest suite.
            </div>
          </div>
        </div>
      </div>

      {/* Background Job Runs Log */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Server className="h-4 w-4 text-indigo-600" />
              <span>Background Worker Execution Runs</span>
            </h3>
            <p className="text-xs text-slate-500">
              Persistent records from the <code>job_runs</code> MongoDB collection.
            </p>
          </div>
          <button
            onClick={fetchJobRunsAndScenarios}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            Refresh Logs
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Job Type</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Processed</th>
                <th className="py-2.5 px-3">Failed</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">
                    No background job runs recorded yet
                  </td>
                </tr>
              ) : (
                jobRuns.slice(0, 8).map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                      {run.jobType}
                    </td>
                    <td className="py-2.5 px-3">
                      {run.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <XCircle className="h-3 w-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{run.processedCount}</td>
                    <td className="py-2.5 px-3 font-semibold text-rose-600">{run.failedCount}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {new Date(run.startedAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate text-[11px]">
                      {run.errorSummary || 'Processed successfully without errors'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="Reset Synthetic Demo Dataset"
        message="This will reset all projects, tasks, users, and activity history back to baseline demo records. Are you sure you want to proceed?"
        confirmText="Reset Dataset"
        isDestructive={true}
        isLoading={isResetting}
        onConfirm={handleResetData}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
