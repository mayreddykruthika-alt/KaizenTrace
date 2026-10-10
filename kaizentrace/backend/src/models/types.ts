export type RunType = 'baseline' | 'failing' | 'verification';

export interface ITestFailure {
  testName: string;
  suite: string;
  error: string;
  stack?: string;
  expected?: string;
  received?: string;
}

export interface ITestResults {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  failures: ITestFailure[];
  rawSummary?: string;
}

export interface IHealthStatus {
  serverRunning: boolean;
  dbConnected: boolean;
  statusCode?: number;
  latencyMs?: number;
  details?: Record<string, any>;
}

export interface IRun {
  _id?: any;
  projectId: string;
  runId: string;
  runType: RunType;
  gitBaseline?: {
    commitHash: string;
    branch?: string;
    clean: boolean;
  };
  gitCurrent?: {
    commitHash: string;
    branch?: string;
    changedFiles: string[];
    diffSummary: string;
  };
  startedAt: Date;
  completedAt: Date;
  testResults: ITestResults;
  healthStatus: IHealthStatus;
  eventsCount?: number;
}

export type EventType =
  | 'test_failure'
  | 'http_error'
  | 'db_operation'
  | 'job_failed'
  | 'code_change'
  | 'audit_event'
  | 'regression_detected';

export interface IDiagnosticEvent {
  _id?: any;
  eventId: string;
  projectId: string;
  runId: string;
  timestamp: Date;
  eventType: EventType;
  component: string;
  message: string;
  sourceFile?: string;
  sourceLine?: number;
  requestId?: string;
  operation?: string;
  outcome: 'failure' | 'error' | 'rejected' | 'modified' | 'success';
  metadata?: Record<string, any>;
}

export interface IChangedFile {
  file: string;
  status: 'modified' | 'added' | 'deleted';
  insertions: number;
  deletions: number;
  patch: string;
  diffUnified5: string;
}

export interface IEvidenceReference {
  id: string;
  type: 'code_diff' | 'test_failure' | 'server_error' | 'db_event' | 'historical_baseline';
  title: string;
  description: string;
  score: number;
  source: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface IRootCauseHypothesis {
  summary: string;
  primaryCause: string;
  affectedFile: string;
  affectedLine: number;
  codeSnippet: string;
  diffSnippet: string;
  explanation: string;
  confidence: number;
  historicalContext?: string;
  uncertaintyNotes?: string;
}

export interface IRecommendedFix {
  title: string;
  reasoning: string;
  targetFile: string;
  originalCode: string;
  proposedCode: string;
  unifiedDiff: string;
  canAutoApply: boolean;
  suggestedTest?: string;
}

export interface IAppliedChanges {
  applied: boolean;
  appliedAt?: Date;
  targetFile?: string;
  backupContent?: string;
  reverted?: boolean;
}

export type InvestigationFinalStatus = 'PENDING' | 'PASS' | 'FAIL' | 'INCONCLUSIVE';

export interface IInvestigation {
  _id?: any;
  investigationId: string;
  incidentId: string;
  projectId: string;
  baselineRunId: string;
  failingRunId: string;
  changedFiles: IChangedFile[];
  evidenceReferences: IEvidenceReference[];
  rootCauseHypothesis: IRootCauseHypothesis;
  recommendedFix: IRecommendedFix;
  appliedChanges: IAppliedChanges;
  verificationRunId?: string;
  finalStatus: InvestigationFinalStatus;
  summary: string;
  createdAt: Date;
  completedAt?: Date;
}
