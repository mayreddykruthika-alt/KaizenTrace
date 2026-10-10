import mongoose, { Schema, Document } from 'mongoose';
import { config } from './config.js';
import { IRun, IDiagnosticEvent, IInvestigation } from './models/types.js';

// Connection state tracking
export interface IDbStatus {
  connected: boolean;
  isAtlas: boolean;
  host: string;
  database: string;
  inMemoryFallback: boolean;
  error?: string;
}

let dbStatus: IDbStatus = {
  connected: false,
  isAtlas: false,
  host: '',
  database: '',
  inMemoryFallback: false,
};

let memoryServer: any = null;

// --- 1. RUNS SCHEMA ---
const runSchema = new Schema<IRun>({
  projectId: { type: String, required: true, index: true },
  runId: { type: String, required: true, unique: true, index: true },
  runType: { type: String, required: true, enum: ['baseline', 'failing', 'verification'], index: true },
  gitBaseline: {
    commitHash: String,
    branch: String,
    clean: Boolean,
  },
  gitCurrent: {
    commitHash: String,
    branch: String,
    changedFiles: [String],
    diffSummary: String,
  },
  startedAt: { type: Date, required: true, default: Date.now },
  completedAt: { type: Date, required: true, default: Date.now },
  testResults: {
    total: { type: Number, required: true },
    passed: { type: Number, required: true },
    failed: { type: Number, required: true },
    durationMs: { type: Number, required: true },
    failures: [
      {
        testName: String,
        suite: String,
        error: String,
        stack: String,
        expected: String,
        received: String,
      },
    ],
    rawSummary: String,
  },
  healthStatus: {
    serverRunning: { type: Boolean, required: true },
    dbConnected: { type: Boolean, required: true },
    statusCode: Number,
    latencyMs: Number,
    details: Schema.Types.Mixed,
  },
  eventsCount: { type: Number, default: 0 },
}, { timestamps: true });

runSchema.index({ projectId: 1, startedAt: -1 });

export const RunModel = mongoose.model<IRun>('Run', runSchema, 'runs');

// --- 2. EVENTS SCHEMA ---
const eventSchema = new Schema<IDiagnosticEvent>({
  eventId: { type: String, required: true, unique: true, index: true },
  projectId: { type: String, required: true, index: true },
  runId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, default: Date.now, index: true },
  eventType: {
    type: String,
    required: true,
    enum: [
      'test_failure',
      'http_error',
      'db_operation',
      'job_failed',
      'code_change',
      'audit_event',
      'regression_detected',
    ],
    index: true,
  },
  component: { type: String, required: true, index: true },
  message: { type: String, required: true },
  sourceFile: String,
  sourceLine: Number,
  requestId: String,
  operation: String,
  outcome: { type: String, required: true, enum: ['failure', 'error', 'rejected', 'modified', 'success'] },
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

eventSchema.index({ runId: 1, eventType: 1 });
eventSchema.index({ projectId: 1, timestamp: -1 });

export const EventModel = mongoose.model<IDiagnosticEvent>('Event', eventSchema, 'events');

// --- 3. INVESTIGATIONS SCHEMA ---
const investigationSchema = new Schema<IInvestigation>({
  investigationId: { type: String, required: true, unique: true, index: true },
  incidentId: { type: String, required: true, index: true },
  projectId: { type: String, required: true, index: true },
  baselineRunId: { type: String, required: true },
  failingRunId: { type: String, required: true },
  changedFiles: [
    {
      file: String,
      status: String,
      insertions: Number,
      deletions: Number,
      patch: String,
      diffUnified5: String,
    },
  ],
  evidenceReferences: [
    new Schema(
      {
        id: String,
        type: { type: String },
        title: String,
        description: String,
        score: Number,
        source: String,
        timestamp: Date,
        details: Schema.Types.Mixed,
      },
      { _id: false }
    ),
  ],
  rootCauseHypothesis: {
    summary: String,
    primaryCause: String,
    affectedFile: String,
    affectedLine: Number,
    codeSnippet: String,
    diffSnippet: String,
    explanation: String,
    confidence: Number,
    historicalContext: String,
    uncertaintyNotes: String,
  },
  recommendedFix: {
    title: String,
    reasoning: String,
    targetFile: String,
    originalCode: String,
    proposedCode: String,
    unifiedDiff: String,
    canAutoApply: Boolean,
    suggestedTest: String,
  },
  appliedChanges: {
    applied: { type: Boolean, default: false },
    appliedAt: Date,
    targetFile: String,
    backupContent: String,
    reverted: Boolean,
  },
  verificationRunId: String,
  finalStatus: {
    type: String,
    required: true,
    enum: ['PENDING', 'PASS', 'FAIL', 'INCONCLUSIVE'],
    default: 'PENDING',
    index: true,
  },
  summary: String,
  createdAt: { type: Date, required: true, default: Date.now, index: true },
  completedAt: Date,
}, { timestamps: true });

investigationSchema.index({ incidentId: 1, createdAt: -1 });

export const InvestigationModel = mongoose.model<IInvestigation>('Investigation', investigationSchema, 'investigations');

// Database connection lifecycle
export async function connectDatabase(): Promise<IDbStatus> {
  const uri = config.mongodbUri.trim();

  // Check if live MongoDB Atlas URI is provided
  if (uri && (uri.startsWith('mongodb+srv://') || uri.startsWith('mongodb://'))) {
    try {
      console.log(`[KaizenTrace DB] Connecting to configured MongoDB Atlas cluster...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });

      const isAtlas = uri.includes('mongodb.net');
      dbStatus = {
        connected: true,
        isAtlas,
        host: mongoose.connection.host || 'Atlas Cluster',
        database: mongoose.connection.name || 'kaizentrace',
        inMemoryFallback: false,
      };

      console.log(`[KaizenTrace DB] Connected successfully to ${isAtlas ? 'MongoDB Atlas' : 'MongoDB'} (${dbStatus.database})`);
      return dbStatus;
    } catch (err: any) {
      console.warn(`[KaizenTrace DB] Failed connecting to provided MONGODB_URI: ${err.message}`);
      dbStatus.error = err.message;
    }
  }

  // Graceful fallback: If Atlas URI is not configured or offline during local dev/evaluation,
  // launch isolated MongoMemoryServer to guarantee full functionality and persistence!
  try {
    console.log(`[KaizenTrace DB] Initializing local in-memory Mongo instance for testing/evaluation...`);
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();

    await mongoose.connect(memoryUri, {
      dbName: 'kaizentrace',
    });

    dbStatus = {
      connected: true,
      isAtlas: false,
      host: '127.0.0.1 (MongoMemoryServer)',
      database: 'kaizentrace',
      inMemoryFallback: true,
    };

    console.log(`[KaizenTrace DB] Connected to local MongoDB instance cleanly at ${memoryUri}`);
    return dbStatus;
  } catch (memErr: any) {
    dbStatus = {
      connected: false,
      isAtlas: false,
      host: '',
      database: '',
      inMemoryFallback: false,
      error: `Failed to connect: ${memErr.message}`,
    };
    console.error(`[KaizenTrace DB] Critical: Could not establish MongoDB connection:`, memErr);
    return dbStatus;
  }
}

export function getDbStatus(): IDbStatus {
  return {
    ...dbStatus,
    connected: mongoose.connection.readyState === 1,
  };
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
  dbStatus.connected = false;
}
