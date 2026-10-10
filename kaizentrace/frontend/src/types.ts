export interface IGitInfo {
  commitHash: string;
  branch: string;
  isClean: boolean;
  uncommittedCount: number;
}

export interface IProjectInfo {
  projectDir: string;
  isValid: boolean;
  git: IGitInfo | null;
  teamflowHealth: {
    serverRunning: boolean;
    dbConnected: boolean;
    statusCode: number;
    latencyMs: number;
    details?: any;
  };
  hasBaseline: boolean;
  baselineInfo: {
    runId: string;
    commitHash: string;
    passed: number;
    total: number;
    establishedAt: string;
  } | null;
}

export interface IDbStatus {
  connected: boolean;
  isAtlas: boolean;
  host: string;
  database: string;
  inMemoryFallback: boolean;
  error?: string;
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
  type: string;
  title: string;
  description: string;
  score: number;
  source: string;
  timestamp: string;
  details?: any;
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
  appliedAt?: string;
  targetFile?: string;
  backupContent?: string;
  reverted?: boolean;
}

export type InvestigationFinalStatus = 'PENDING' | 'PASS' | 'FAIL' | 'INCONCLUSIVE';

export interface IInvestigation {
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
  createdAt: string;
  completedAt?: string;
}

export type StepState = 'pending' | 'running' | 'completed' | 'failed';
