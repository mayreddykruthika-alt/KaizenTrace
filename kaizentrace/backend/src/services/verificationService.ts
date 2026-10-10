import { v4 as uuidv4 } from 'uuid';
import { TestRunnerService } from './testRunnerService.js';
import { HealthCheckService } from './healthCheckService.js';
import { GitService } from './gitService.js';
import { RunModel, EventModel, InvestigationModel } from '../database.js';
import { IRun, IDiagnosticEvent, InvestigationFinalStatus } from '../models/types.js';

export class VerificationService {
  /**
   * Rerun tests and health checks to rigorously verify whether the incident is resolved
   */
  static async verifyInvestigation(
    projectDir: string,
    investigationId: string,
    projectId = 'teamflow'
  ): Promise<{
    status: InvestigationFinalStatus;
    verificationRun: IRun;
    beforeVsAfter: {
      beforeFailedCount: number;
      afterFailedCount: number;
      fixedTestNames: string[];
    };
    summary: string;
  }> {
    const startedAt = new Date();
    const verificationRunId = `verify_${Date.now()}_${uuidv4().substring(0, 8)}`;

    const investigation = await InvestigationModel.findOne({ investigationId });
    if (!investigation) {
      throw new Error(`Investigation '${investigationId}' not found`);
    }

    // 1. Get current git status
    const gitInfo = await GitService.getCommitInfo(projectDir);
    const changes = await GitService.detectChanges(projectDir);

    // 2. Rerun actual Vitest suite
    const testResults = await TestRunnerService.runTests(projectDir);

    // 3. Check TeamFlow server health
    const healthStatus = await HealthCheckService.checkTeamFlowHealth();

    const completedAt = new Date();

    // 4. Determine rigorous outcome
    let finalStatus: InvestigationFinalStatus = 'FAIL';

    if (testResults.failed === 0 && testResults.passed > 0) {
      finalStatus = 'PASS';
    } else if (testResults.total === 0) {
      finalStatus = 'INCONCLUSIVE';
    } else {
      finalStatus = 'FAIL';
    }

    // 5. Create verification run record in MongoDB
    const verificationRun: IRun = {
      projectId,
      runId: verificationRunId,
      runType: 'verification',
      gitBaseline: {
        commitHash: gitInfo.commitHash,
        branch: gitInfo.branch,
        clean: gitInfo.isClean,
      },
      gitCurrent: {
        commitHash: gitInfo.commitHash,
        branch: gitInfo.branch,
        changedFiles: changes.changedFiles.map(c => c.file),
        diffSummary: changes.changedFiles.length > 0
          ? `${changes.changedFiles.length} file(s) currently modified`
          : 'Clean working tree',
      },
      startedAt,
      completedAt,
      testResults,
      healthStatus,
      eventsCount: 1,
    };

    await RunModel.create(verificationRun);

    // Record verification event
    const verifyEvent: IDiagnosticEvent = {
      eventId: `evt_${uuidv4().substring(0, 8)}`,
      projectId,
      runId: verificationRunId,
      timestamp: new Date(),
      eventType: finalStatus === 'PASS' ? 'code_change' : 'test_failure',
      component: 'VerificationRunner',
      message: `Verification outcome: ${finalStatus} (${testResults.passed}/${testResults.total} tests passed)`,
      operation: 'verify_investigation',
      outcome: finalStatus === 'PASS' ? 'success' : 'failure',
      metadata: {
        investigationId,
        finalStatus,
        passed: testResults.passed,
        failed: testResults.failed,
      },
    };

    await EventModel.create(verifyEvent);

    // 6. Compare Before vs After
    // Retrieve failing run
    const failingRun = await RunModel.findOne({ runId: investigation.failingRunId }).lean();
    const beforeFailedCount = failingRun?.testResults?.failed || 0;
    const afterFailedCount = testResults.failed;

    const previousFailingNames = (failingRun?.testResults?.failures || []).map(f => f.testName);
    const currentFailingNames = testResults.failures.map(f => f.testName);
    const fixedTestNames = previousFailingNames.filter(name => !currentFailingNames.includes(name));

    const summary = finalStatus === 'PASS'
      ? `Incident resolved! All ${testResults.passed} tests passed. Verified regression fix.`
      : finalStatus === 'FAIL'
      ? `Verification failed: ${testResults.failed} test(s) still failing.`
      : 'Verification inconclusive: No runnable tests executed.';

    // 7. Update investigation document in MongoDB
    await InvestigationModel.updateOne(
      { investigationId },
      {
        $set: {
          verificationRunId,
          finalStatus,
          summary,
          completedAt: new Date(),
        },
      }
    );

    return {
      status: finalStatus,
      verificationRun,
      beforeVsAfter: {
        beforeFailedCount,
        afterFailedCount,
        fixedTestNames,
      },
      summary,
    };
  }
}
