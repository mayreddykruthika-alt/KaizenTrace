import React, { useState, useEffect } from 'react';
import {
  fetchHealth,
  fetchProject,
  establishBaseline,
  runInvestigation,
  applyFix,
  verifyInvestigation,
  fetchHistory,
  injectScenario,
  resetDemo,
} from './api.js';
import { IProjectInfo, IDbStatus, IInvestigation, StepState } from './types.js';
import { Header } from './components/Header.js';
import { WorkflowStep } from './components/WorkflowStep.js';
import { DiffViewer } from './components/DiffViewer.js';
import { ApplyFixModal } from './components/ApplyFixModal.js';
import { HistoryDrawer } from './components/HistoryDrawer.js';
import {
  Play,
  CheckCircle2,
  Check,
  Wrench,
  History,
  Info,
  Sparkles,
} from 'lucide-react';

export const App: React.FC = () => {
  const [project, setProject] = useState<IProjectInfo | null>(null);
  const [dbStatus, setDbStatus] = useState<IDbStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [investigating, setInvestigating] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [activeInvestigation, setActiveInvestigation] = useState<IInvestigation | null>(null);
  const [historyList, setHistoryList] = useState<IInvestigation[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isFixModalOpen, setIsFixModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Load initial status
  const loadStatus = async () => {
    try {
      setLoading(true);
      const [healthRes, projRes, histRes] = await Promise.all([
        fetchHealth(),
        fetchProject(),
        fetchHistory(),
      ]);
      setDbStatus(healthRes.database);
      setProject(projRes);
      setHistoryList(histRes.investigations || []);

      // If active investigation is not set, load the most recent one if available
      if (!activeInvestigation && histRes.investigations && histRes.investigations.length > 0) {
        setActiveInvestigation(histRes.investigations[0]);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // 1. Establish baseline
  const handleEstablishBaseline = async () => {
    try {
      setLoading(true);
      const res = await establishBaseline();
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
      await loadStatus();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Main Action: Run Investigation
  const handleRunInvestigation = async () => {
    try {
      setInvestigating(true);
      const res = await runInvestigation();
      if (res.success) {
        setActiveInvestigation(res.investigation);
        showToast(`Investigation ${res.investigation.investigationId} completed.`, 'success');
      }
      await loadStatus();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setInvestigating(false);
    }
  };

  // 3. Apply Fix
  const handleApplyFix = async () => {
    if (!activeInvestigation) return;
    try {
      setLoading(true);
      const res = await applyFix(activeInvestigation.investigationId);
      if (res.success) {
        showToast(res.message, 'success');
        setIsFixModalOpen(false);
        // Refresh active investigation
        const updatedHist = await fetchHistory();
        setHistoryList(updatedHist.investigations);
        const refreshed = updatedHist.investigations.find(i => i.investigationId === activeInvestigation.investigationId);
        if (refreshed) setActiveInvestigation(refreshed);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 4. Verify Fix
  const handleVerifyFix = async () => {
    if (!activeInvestigation) return;
    try {
      setVerifying(true);
      const res = await verifyInvestigation(activeInvestigation.investigationId);
      showToast(res.summary, res.status === 'PASS' ? 'success' : 'error');
      // Refresh active investigation
      const updatedHist = await fetchHistory();
      setHistoryList(updatedHist.investigations);
      const refreshed = updatedHist.investigations.find(i => i.investigationId === activeInvestigation.investigationId);
      if (refreshed) setActiveInvestigation(refreshed);
      await loadStatus();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setVerifying(false);
    }
  };

  // 5. Inject Scenarios
  const handleInjectScenario = async (scenario: 'A' | 'B') => {
    try {
      setLoading(true);
      const res = await injectScenario(scenario);
      showToast(res.message, res.success ? 'success' : 'error');
      await loadStatus();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 6. Reset Demo
  const handleResetDemo = async () => {
    try {
      setLoading(true);
      const res = await resetDemo(false);
      showToast(res.gitResetMessage, res.success ? 'success' : 'error');
      await loadStatus();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Compute individual workflow step states
  const inv = activeInvestigation;
  const hasInv = !!inv;

  // Step 1: Baseline
  const step1State: StepState = project?.hasBaseline ? 'completed' : 'pending';

  // Step 2: Code changes
  const step2State: StepState = investigating
    ? 'running'
    : hasInv && inv.changedFiles.length > 0
    ? 'completed'
    : hasInv && inv.changedFiles.length === 0
    ? 'completed'
    : 'pending';

  // Step 3: Failure detection
  const hasFailures = inv?.evidenceReferences.some(e => e.type === 'test_failure');
  const step3State: StepState = investigating
    ? 'running'
    : hasInv && hasFailures
    ? 'failed'
    : hasInv && !hasFailures
    ? 'completed'
    : 'pending';

  // Step 4: Root cause hypothesis
  const step4State: StepState = investigating
    ? 'running'
    : hasInv && inv.rootCauseHypothesis.primaryCause
    ? 'completed'
    : 'pending';

  // Step 5: Recommended fix
  const step5State: StepState = investigating
    ? 'running'
    : hasInv && inv.appliedChanges?.applied
    ? 'completed'
    : hasInv && inv.recommendedFix.targetFile
    ? 'completed'
    : 'pending';

  // Step 6: Verification
  const step6State: StepState = verifying
    ? 'running'
    : inv?.finalStatus === 'PASS'
    ? 'completed'
    : inv?.finalStatus === 'FAIL'
    ? 'failed'
    : 'pending';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)' }}>
      {/* Sticky Header with Real Connection Badges */}
      <Header
        project={project}
        dbStatus={dbStatus}
        loading={loading || investigating}
        onRefresh={loadStatus}
        onEstablishBaseline={handleEstablishBaseline}
        onInjectScenario={handleInjectScenario}
        onResetDemo={handleResetDemo}
      />

      {/* Toast notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '5.5rem',
            right: '1.5rem',
            zIndex: 40,
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            backgroundColor: toastMessage.type === 'success' ? 'var(--success-bg)' : toastMessage.type === 'error' ? 'var(--danger-bg)' : 'var(--info-bg)',
            color: toastMessage.type === 'success' ? 'var(--success-text)' : toastMessage.type === 'error' ? 'var(--danger-text)' : 'var(--info-text)',
            border: `1px solid ${toastMessage.type === 'success' ? 'var(--success-border)' : toastMessage.type === 'error' ? 'var(--danger-border)' : 'var(--info-border)'}`,
          }}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="container" style={{ flexGrow: 1, padding: '2rem 1.5rem', maxWidth: '1100px' }}>
        {/* Prominent Action Bar */}
        <div
          className="card"
          style={{
            padding: '1.25rem 1.75rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            backgroundColor: '#ffffff',
            borderLeft: '4px solid var(--primary)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Incident Investigation Workspace
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Detect working tree modifications, reproduce failures, pull MongoDB evidence, and verify recovery.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setIsHistoryOpen(true)}
              style={{ padding: '0.55rem 0.9rem' }}
            >
              <History size={15} />
              Saved Investigations ({historyList.length})
            </button>

            {/* THE ONE PROMINENT MAIN ACTION */}
            <button
              className="btn btn-primary"
              onClick={handleRunInvestigation}
              disabled={investigating || loading}
              style={{
                padding: '0.65rem 1.5rem',
                fontSize: '0.9375rem',
                fontWeight: 600,
                boxShadow: '0 4px 6px -1px rgba(67, 56, 202, 0.25)',
              }}
            >
              {investigating ? (
                <>
                  <div className="animate-spin" style={{ width: '1rem', height: '1rem', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  Analyzing Code & Tests...
                </>
              ) : (
                <>
                  <Play size={16} fill="#ffffff" />
                  Run Investigation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Vertical Sequence Workflow Panel */}
        <div className="card" style={{ padding: '2rem 2.25rem', backgroundColor: '#ffffff' }}>
          {/* STEP 1: Project & Baseline */}
          <WorkflowStep
            stepNumber={1}
            title="Project and Baseline"
            subtitle="Known-good Git reference point and passing regression baseline stored in MongoDB"
            state={step1State}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '0.6rem',
                padding: '1rem 1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                fontSize: '0.8125rem',
              }}
            >
              <div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Baseline Status</div>
                <div style={{ fontWeight: 600, color: project?.hasBaseline ? 'var(--success)' : 'var(--warning)' }}>
                  {project?.hasBaseline ? 'Established & Verified' : 'No Baseline Recorded'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Git Commit Reference</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {project?.baselineInfo?.commitHash?.substring(0, 7) || project?.git?.commitHash?.substring(0, 7) || 'HEAD'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Baseline Tests Passing</div>
                <div style={{ fontWeight: 600 }}>
                  {project?.baselineInfo ? `${project.baselineInfo.passed}/${project.baselineInfo.total} Passed (100%)` : 'Run baseline to record'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Working Tree State</div>
                <div style={{ fontWeight: 600, color: project?.git?.isClean ? 'var(--success)' : 'var(--warning)' }}>
                  {project?.git ? (project.git.isClean ? 'Clean' : `${project.git.uncommittedCount} modified file(s)`) : 'Checking...'}
                </div>
              </div>
            </div>
          </WorkflowStep>

          {/* STEP 2: Current Code Changes */}
          <WorkflowStep
            stepNumber={2}
            title="Current Code Changes"
            subtitle="Working tree inspection via Git CLI (git status, git diff --unified=5)"
            state={step2State}
          >
            {hasInv && (
              <DiffViewer changedFiles={inv.changedFiles} />
            )}
          </WorkflowStep>

          {/* STEP 3: Failure Detection */}
          <WorkflowStep
            stepNumber={3}
            title="Failure Detection"
            subtitle="Automated test suite execution and diagnostic failure telemetry"
            state={step3State}
          >
            {hasInv && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {inv.evidenceReferences
                  .filter(e => e.type === 'test_failure')
                  .map(fail => (
                    <div
                      key={fail.id}
                      style={{
                        padding: '1rem',
                        backgroundColor: 'var(--danger-bg)',
                        border: '1px solid var(--danger-border)',
                        borderRadius: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--danger-text)', fontSize: '0.875rem' }}>
                          {fail.title}
                        </span>
                        <span className="badge badge-danger">Evidence Score: {fail.score}/100</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: '#881337', backgroundColor: '#ffffff', padding: '0.6rem 0.75rem', borderRadius: '0.35rem', border: '1px solid #fecdd3' }}>
                        {fail.description}
                      </div>
                    </div>
                  ))}

                {inv.evidenceReferences.every(e => e.type !== 'test_failure') && (
                  <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: '0.5rem', color: 'var(--success-text)', fontSize: '0.875rem' }}>
                    ✓ No active test failures or runtime server errors detected.
                  </div>
                )}
              </div>
            )}
          </WorkflowStep>

          {/* STEP 4: Investigation & Root Cause */}
          <WorkflowStep
            stepNumber={4}
            title="Investigation and Root Cause"
            subtitle="Rule-based correlation engine combining diff, execution traces, and MongoDB Atlas evidence"
            state={step4State}
          >
            {hasInv && inv.rootCauseHypothesis.primaryCause && (
              <div
                style={{
                  backgroundColor: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '0.6rem',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={18} color="var(--primary)" />
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {inv.rootCauseHypothesis.primaryCause}
                    </span>
                  </div>
                  <span className="badge badge-info">
                    Confidence: {inv.rootCauseHypothesis.confidence}%
                  </span>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {inv.rootCauseHypothesis.explanation}
                </p>

                {inv.rootCauseHypothesis.affectedFile && inv.rootCauseHypothesis.affectedFile !== 'None' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Affected File: </span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{inv.rootCauseHypothesis.affectedFile}</strong>
                    </div>
                    {inv.rootCauseHypothesis.affectedLine > 0 && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Line: </span>
                        <strong>{inv.rootCauseHypothesis.affectedLine}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Historical Comparison */}
                {inv.rootCauseHypothesis.historicalContext && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Info size={14} color="var(--primary)" />
                    <span><strong>Historical Context:</strong> {inv.rootCauseHypothesis.historicalContext}</span>
                  </div>
                )}
              </div>
            )}
          </WorkflowStep>

          {/* STEP 5: Recommended Fix */}
          <WorkflowStep
            stepNumber={5}
            title="Recommended Fix"
            subtitle="Targeted patch with review confirmation and safety boundaries"
            state={step5State}
          >
            {hasInv && inv.recommendedFix.targetFile && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '0.6rem',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                    {inv.recommendedFix.title}
                  </div>
                  {inv.appliedChanges?.applied ? (
                    <span className="badge badge-success">
                      <Check size={12} /> Patch Applied
                    </span>
                  ) : (
                    <span className="badge badge-warning">Pending Review</span>
                  )}
                </div>

                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {inv.recommendedFix.reasoning}
                </p>

                {/* Action Buttons: Review & Apply Fix, and Verify Fix */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {!inv.appliedChanges?.applied ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => setIsFixModalOpen(true)}
                      disabled={loading}
                    >
                      <Wrench size={15} />
                      Review and Apply Fix
                    </button>
                  ) : (
                    <button
                      className="btn btn-success"
                      onClick={handleVerifyFix}
                      disabled={verifying}
                    >
                      {verifying ? (
                        <>
                          <div className="animate-spin" style={{ width: '1rem', height: '1rem', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                          Running Verification Tests...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={15} />
                          Verify Fix Now
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </WorkflowStep>

          {/* STEP 6: Verification and Final Status */}
          <WorkflowStep
            stepNumber={6}
            title="Verification and Final Status"
            subtitle="Rerun test suite and establish recovery proof"
            state={step6State}
            isLast={true}
          >
            {hasInv && (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '0.6rem',
                  border: '1px solid',
                  backgroundColor: inv.finalStatus === 'PASS' ? 'var(--success-bg)' : inv.finalStatus === 'FAIL' ? 'var(--danger-bg)' : 'var(--bg-card-subtle)',
                  borderColor: inv.finalStatus === 'PASS' ? 'var(--success-border)' : inv.finalStatus === 'FAIL' ? 'var(--danger-border)' : 'var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: inv.finalStatus === 'PASS' ? 'var(--success-text)' : inv.finalStatus === 'FAIL' ? 'var(--danger-text)' : 'var(--text-main)' }}>
                      FINAL STATUS: {inv.finalStatus}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {inv.summary}
                  </p>
                  <div style={{ marginTop: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                    Investigation ID: {inv.investigationId}
                  </div>
                </div>

                {inv.finalStatus === 'PENDING' && !inv.appliedChanges?.applied && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setIsFixModalOpen(true)}
                  >
                    Proceed with Fix
                  </button>
                )}

                {inv.finalStatus === 'PENDING' && inv.appliedChanges?.applied && (
                  <button
                    className="btn btn-primary"
                    onClick={handleVerifyFix}
                    disabled={verifying}
                  >
                    {verifying ? 'Rerunning Tests...' : 'Run Verification Tests'}
                  </button>
                )}
              </div>
            )}
          </WorkflowStep>
        </div>
      </main>

      {/* Review and Apply Fix Modal */}
      {activeInvestigation && (
        <ApplyFixModal
          isOpen={isFixModalOpen}
          onClose={() => setIsFixModalOpen(false)}
          onConfirm={handleApplyFix}
          recommendedFix={activeInvestigation.recommendedFix}
          loading={loading}
        />
      )}

      {/* Historical Investigation Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        investigations={historyList}
        onSelectInvestigation={(selected) => setActiveInvestigation(selected)}
      />
    </div>
  );
};
