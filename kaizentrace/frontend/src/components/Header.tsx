import React from 'react';
import { IProjectInfo, IDbStatus } from '../types.js';
import { ShieldCheck, Database, GitBranch, CheckCircle2, AlertCircle, RefreshCw, Zap, RotateCcw } from 'lucide-react';

interface HeaderProps {
  project: IProjectInfo | null;
  dbStatus: IDbStatus | null;
  loading: boolean;
  onRefresh: () => void;
  onEstablishBaseline: () => void;
  onInjectScenario: (scenario: 'A' | 'B') => void;
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  dbStatus,
  loading,
  onRefresh,
  onEstablishBaseline,
  onInjectScenario,
  onResetDemo,
}) => {
  const isHealthy = project?.teamflowHealth.serverRunning;
  const dbConnected = dbStatus?.connected;

  return (
    <header style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: '#ffffff', position: 'sticky', top: 0, zIndex: 30 }}>
      {/* Top Banner */}
      <div className="container" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                KaizenTrace
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Evidence-Based Software Incident Investigation Tool
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* TeamFlow Project Status */}
          <div className={`badge ${project?.isValid ? 'badge-success' : 'badge-warning'}`} title={project?.projectDir}>
            <GitBranch size={13} />
            <span>TeamFlow: {project?.git?.commitHash ? project.git.commitHash.substring(0, 7) : 'Connected'}</span>
            <span style={{ opacity: 0.6 }}>({project?.git?.isClean ? 'Clean' : `${project?.git?.uncommittedCount} modified`})</span>
          </div>

          {/* TeamFlow Server Health */}
          <div className={`badge ${isHealthy ? 'badge-success' : 'badge-danger'}`}>
            {isHealthy ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            <span>Server: {isHealthy ? 'Live (Port 5000)' : 'Offline / Crashed'}</span>
          </div>

          {/* MongoDB Atlas Status */}
          <div className={`badge ${dbConnected ? 'badge-success' : 'badge-danger'}`} title={dbStatus?.host}>
            <Database size={13} />
            <span>MongoDB: {dbStatus?.isAtlas ? 'Atlas Live' : dbStatus?.inMemoryFallback ? 'Local DB' : 'Disconnected'}</span>
          </div>

          <button
            className="btn btn-secondary"
            onClick={onRefresh}
            disabled={loading}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            title="Refresh status"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Action Strip: Scenarios & Controls */}
      <div style={{ backgroundColor: 'var(--bg-card-subtle)', borderTop: '1px solid var(--border-subtle)', padding: '0.6rem 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fault Simulation:
            </span>
            <button
              className="btn-scenario"
              onClick={() => onInjectScenario('A')}
              disabled={loading}
              title="Inject Scenario A: Remove requireRole check on task update"
            >
              <Zap size={13} color="#d97706" />
              Scenario A: Permission Regression
            </button>
            <button
              className="btn-scenario"
              onClick={() => onInjectScenario('B')}
              disabled={loading}
              title="Inject Scenario B: Simulate database persistence failure"
            >
              <Zap size={13} color="#e11d48" />
              Scenario B: Task Update Failure
            </button>
            <button
              className="btn-scenario"
              onClick={onResetDemo}
              disabled={loading}
              title="Restore clean working tree"
            >
              <RotateCcw size={13} />
              Reset Code to Baseline
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={onEstablishBaseline}
              disabled={loading}
              style={{ fontSize: '0.8125rem' }}
            >
              <CheckCircle2 size={14} color="var(--success)" />
              Record Baseline
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
