import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { getDbStatus, RunModel, InvestigationModel, EventModel } from '../database.js';
import { GitService } from '../services/gitService.js';
import { HealthCheckService } from '../services/healthCheckService.js';
import { BaselineService } from '../services/baselineService.js';
import { InvestigationEngine } from '../services/investigationEngine.js';
import { FixService } from '../services/fixService.js';
import { VerificationService } from '../services/verificationService.js';
import { DemoScenarioService } from '../services/demoScenarioService.js';

let currentProjectDir = config.teamflowPath;

export const apiRouter = Router();

// 1. Health check & DB status
apiRouter.get('/health', async (_req: Request, res: Response) => {
  const dbStatus = getDbStatus();
  const teamflowHealth = await HealthCheckService.checkTeamFlowHealth();

  res.json({
    status: 'ok',
    service: 'kaizentrace-backend',
    timestamp: new Date(),
    database: dbStatus,
    teamflow: teamflowHealth,
  });
});

// 2. Project connection status
apiRouter.get('/project', async (_req: Request, res: Response) => {
  try {
    const dirValidation = await GitService.validateProjectDirectory(currentProjectDir);
    const gitInfo = dirValidation.isValid
      ? await GitService.getCommitInfo(currentProjectDir)
      : null;
    const teamflowHealth = await HealthCheckService.checkTeamFlowHealth();
    const latestBaseline = await BaselineService.getLatestHealthyBaseline();

    res.json({
      projectDir: currentProjectDir,
      isValid: dirValidation.isValid,
      git: gitInfo,
      teamflowHealth,
      hasBaseline: !!latestBaseline,
      baselineInfo: latestBaseline
        ? {
            runId: latestBaseline.runId,
            commitHash: latestBaseline.gitBaseline?.commitHash,
            passed: latestBaseline.testResults.passed,
            total: latestBaseline.testResults.total,
            establishedAt: latestBaseline.completedAt,
          }
        : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Configure project directory
apiRouter.post('/project/config', async (req: Request, res: Response) => {
  try {
    const { projectDir } = req.body;
    if (!projectDir || typeof projectDir !== 'string') {
      res.status(400).json({ error: 'projectDir string is required' });
      return;
    }

    const validation = await GitService.validateProjectDirectory(projectDir);
    if (!validation.isValid) {
      res.status(400).json({ error: validation.error || 'Invalid project directory' });
      return;
    }

    currentProjectDir = projectDir;
    res.json({
      success: true,
      projectDir: currentProjectDir,
      message: 'Project directory configured successfully',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. List past runs
apiRouter.get('/runs', async (_req: Request, res: Response) => {
  try {
    const runs = await RunModel.find({ projectId: 'teamflow' })
      .sort({ startedAt: -1 })
      .limit(30)
      .lean();
    res.json({ runs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Establish healthy baseline
apiRouter.post('/runs/baseline', async (_req: Request, res: Response) => {
  try {
    const result = await BaselineService.establishBaseline(currentProjectDir);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Run complete investigation
apiRouter.post('/investigations/run', async (_req: Request, res: Response) => {
  try {
    const investigation = await InvestigationEngine.runInvestigation(currentProjectDir);
    res.json({
      success: true,
      investigation,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Investigation history & MongoDB Aggregations (must be before :id param)
apiRouter.get('/investigations/history', async (_req: Request, res: Response) => {
  try {
    const investigations = await InvestigationModel.find({ projectId: 'teamflow' })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Aggregation: count investigations grouped by finalStatus
    const statusAgg = await InvestigationModel.aggregate([
      { $match: { projectId: 'teamflow' } },
      { $group: { _id: '$finalStatus', count: { $sum: 1 } } },
    ]);

    // Aggregation: top failing components across events
    const topFailures = await EventModel.aggregate([
      { $match: { projectId: 'teamflow', eventType: 'test_failure' } },
      { $group: { _id: '$component', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      investigations,
      stats: {
        statusBreakdown: statusAgg,
        topFailures,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Get investigation by ID
apiRouter.get('/investigations/:id', async (req: Request, res: Response) => {
  try {
    const investigation = await InvestigationModel.findOne({ investigationId: req.params.id }).lean();
    if (!investigation) {
      res.status(404).json({ error: 'Investigation not found' });
      return;
    }
    res.json({ investigation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Apply recommended fix
apiRouter.post('/investigations/:id/apply-fix', async (req: Request, res: Response) => {
  try {
    const result = await FixService.applyFix(currentProjectDir, req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Verify fix
apiRouter.post('/investigations/:id/verify', async (req: Request, res: Response) => {
  try {
    const result = await VerificationService.verifyInvestigation(currentProjectDir, req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Revert fix if requested
apiRouter.post('/investigations/:id/revert', async (req: Request, res: Response) => {
  try {
    const success = await FixService.revertFix(currentProjectDir, req.params.id);
    res.json({ success, message: success ? 'Fix reverted successfully.' : 'Could not revert fix.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});



// 11. Demo scenario triggers
apiRouter.post('/demo/inject-scenario', async (req: Request, res: Response) => {
  try {
    const { scenario } = req.body;
    if (scenario === 'A') {
      const result = await DemoScenarioService.injectScenarioA(currentProjectDir);
      res.json(result);
    } else if (scenario === 'B') {
      const result = await DemoScenarioService.injectScenarioB(currentProjectDir);
      res.json(result);
    } else {
      res.status(400).json({ error: "Unknown scenario. Use 'A' (Permission Regression) or 'B' (Persistence Failure)" });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. Reset demo data & working tree
apiRouter.post('/demo/reset', async (req: Request, res: Response) => {
  try {
    const { clearHistory } = req.body;
    const gitReset = await DemoScenarioService.resetToBaseline(currentProjectDir);

    if (clearHistory) {
      // Clean synthetic demo runs/events if explicitly requested (demonstrates deleteMany)
      await RunModel.deleteMany({ projectId: 'teamflow', runType: { $ne: 'baseline' } });
      await EventModel.deleteMany({ projectId: 'teamflow', eventType: { $ne: 'code_change' } });
    }

    res.json({
      success: gitReset.success,
      gitResetMessage: gitReset.message,
      clearedHistory: !!clearHistory,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
