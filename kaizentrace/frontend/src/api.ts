import { IProjectInfo, IDbStatus, IInvestigation } from './types.js';

const API_BASE = '/api';

export async function fetchHealth(): Promise<{
  status: string;
  database: IDbStatus;
  teamflow: any;
}> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
  return res.json();
}

export async function fetchProject(): Promise<IProjectInfo> {
  const res = await fetch(`${API_BASE}/project`);
  if (!res.ok) throw new Error(`Fetch project info failed: HTTP ${res.status}`);
  return res.json();
}

export async function establishBaseline(): Promise<{
  success: boolean;
  run: any;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/runs/baseline`, { method: 'POST' });
  if (!res.ok) throw new Error(`Establish baseline failed: HTTP ${res.status}`);
  return res.json();
}

export async function runInvestigation(): Promise<{
  success: boolean;
  investigation: IInvestigation;
}> {
  const res = await fetch(`${API_BASE}/investigations/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Run investigation failed: HTTP ${res.status}`);
  return res.json();
}

export async function applyFix(investigationId: string): Promise<{
  success: boolean;
  targetFile: string;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/investigations/${investigationId}/apply-fix`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Apply fix failed: HTTP ${res.status}`);
  return res.json();
}

export async function verifyInvestigation(investigationId: string): Promise<{
  status: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  verificationRun: any;
  beforeVsAfter: {
    beforeFailedCount: number;
    afterFailedCount: number;
    fixedTestNames: string[];
  };
  summary: string;
}> {
  const res = await fetch(`${API_BASE}/investigations/${investigationId}/verify`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Verification failed: HTTP ${res.status}`);
  return res.json();
}

export async function revertFix(investigationId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/investigations/${investigationId}/revert`, { method: 'POST' });
  if (!res.ok) throw new Error(`Revert fix failed: HTTP ${res.status}`);
  return res.json();
}

export async function fetchHistory(): Promise<{
  investigations: IInvestigation[];
  stats: any;
}> {
  const res = await fetch(`${API_BASE}/investigations/history`);
  if (!res.ok) throw new Error(`Fetch history failed: HTTP ${res.status}`);
  return res.json();
}

export async function injectScenario(scenario: 'A' | 'B'): Promise<{
  success: boolean;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/demo/inject-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  });
  if (!res.ok) throw new Error(`Inject scenario failed: HTTP ${res.status}`);
  return res.json();
}

export async function resetDemo(clearHistory = false): Promise<{
  success: boolean;
  gitResetMessage: string;
  clearedHistory: boolean;
}> {
  const res = await fetch(`${API_BASE}/demo/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clearHistory }),
  });
  if (!res.ok) throw new Error(`Reset demo failed: HTTP ${res.status}`);
  return res.json();
}
