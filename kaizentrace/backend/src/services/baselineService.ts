import { v4 as uuidv4 } from 'uuid';
import { GitService } from './gitService.js';
import { TestRunnerService } from './testRunnerService.js';
import { HealthCheckService } from './healthCheckService.js';
import { RunModel, EventModel } from '../database.js';
import { IRun, IDiagnosticEvent } from '../models/types.js';

export class BaselineService {
  /**
   * Establish and save a known-healthy baseline in MongoDB Atlas
   */
  static async establishBaseline(projectDir: string, projectId = 'teamflow'): Promise<{
    success: boolean;
    run: IRun;
    message: string;
  }> {
    const startedAt = new Date();
    const runId = `baseline_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // 1. Get Git info
    const gitInfo = await GitService.getCommitInfo(projectDir);

    // 2. Run actual tests
    const testResults = await TestRunnerService.runTests(projectDir);

    // 3. Check health status
    const healthStatus = await HealthCheckService.checkTeamFlowHealth();

    const completedAt = new Date();

    // Verify whether the run is genuinely healthy
    const isHealthy = testResults.failed === 0 && testResults.passed > 0;

    const runData: IRun = {
      projectId,
      runId,
      runType: 'baseline',
      gitBaseline: {
        commitHash: gitInfo.commitHash,
        branch: gitInfo.branch,
        clean: gitInfo.isClean,
      },
      gitCurrent: {
        commitHash: gitInfo.commitHash,
        branch: gitInfo.branch,
        changedFiles: [],
        diffSummary: gitInfo.isClean ? 'Clean working tree' : `${gitInfo.uncommittedCount} uncommitted items`,
      },
      startedAt,
      completedAt,
      testResults,
      healthStatus,
      eventsCount: 1,
    };

    // Save baseline run in MongoDB using insertOne / save
    const savedRun = await RunModel.create(runData);

    // Record baseline establishment event
    const baselineEvent: IDiagnosticEvent = {
      eventId: `evt_${uuidv4().substring(0, 8)}`,
      projectId,
      runId,
      timestamp: new Date(),
      eventType: isHealthy ? 'code_change' : 'test_failure',
      component: 'BaselineService',
      message: isHealthy
        ? `Healthy baseline established at commit ${gitInfo.commitHash.substring(0, 7)} with ${testResults.passed}/${testResults.total} tests passing`
        : `Baseline attempt failed: ${testResults.failed} test(s) failed`,
      operation: 'establish_baseline',
      outcome: isHealthy ? 'success' : 'failure',
      metadata: {
        commitHash: gitInfo.commitHash,
        passed: testResults.passed,
        failed: testResults.failed,
      },
    };

    await EventModel.create(baselineEvent);

    return {
      success: isHealthy,
      run: savedRun.toObject(),
      message: isHealthy
        ? `Known-good baseline recorded successfully (${testResults.passed} tests passed, Git: ${gitInfo.commitHash.substring(0, 7)}).`
        : `Baseline check failed: ${testResults.failed} test(s) failed. Project cannot be marked healthy until tests pass.`,
    };
  }

  /**
   * Get the latest healthy baseline run from MongoDB
   */
  static async getLatestHealthyBaseline(projectId = 'teamflow'): Promise<IRun | null> {
    return RunModel.findOne({
      projectId,
      runType: 'baseline',
      'testResults.failed': 0,
      'testResults.passed': { $gt: 0 },
    })
      .sort({ startedAt: -1 })
      .lean();
  }
}
