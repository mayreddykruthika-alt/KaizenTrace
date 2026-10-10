import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { ITestResults, ITestFailure } from '../models/types.js';

const execAsync = promisify(exec);

export class TestRunnerService {
  /**
   * Run the actual TeamFlow vitest suite and extract real execution metrics
   */
  static async runTests(projectDir: string, specificTestFile?: string): Promise<ITestResults> {
    const backendDir = path.join(projectDir, 'backend');
    const startTime = Date.now();

    // Use npx vitest run --reporter=verbose
    const testCmd = specificTestFile
      ? `npx vitest run "${specificTestFile}" --reporter=verbose`
      : `npx vitest run --reporter=verbose`;

    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    try {
      const res = await execAsync(testCmd, {
        cwd: backendDir,
        timeout: 45000,
        maxBuffer: 20 * 1024 * 1024,
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });
      stdout = res.stdout;
      stderr = res.stderr;
      exitCode = 0;
    } catch (err: any) {
      stdout = err.stdout || '';
      stderr = err.stderr || err.message || '';
      exitCode = err.code || 1;
    }

    const durationMs = Date.now() - startTime;
    return this.parseVitestOutput(stdout, stderr, durationMs, exitCode);
  }

  /**
   * Parse real stdout/stderr from Vitest execution to extract test counts, failures, and stack traces
   */
  private static parseVitestOutput(
    stdout: string,
    stderr: string,
    durationMs: number,
    exitCode: number
  ): ITestResults {
    // Strip ANSI color codes
    const cleanStr = (s: string) => s.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
    const cleanCombined = cleanStr(`${stdout}\n${stderr}`);
    const failures: ITestFailure[] = [];

    // Match tests summary e.g.: Tests  1 failed | 10 passed (11) or Tests  11 passed (11)
    let total = 0;
    let passed = 0;
    let failed = 0;

    const testsLineMatch = cleanCombined.match(/Tests\s+([^\n\r]+)/i);
    if (testsLineMatch) {
      const summaryLine = testsLineMatch[1];
      const failMatch = summaryLine.match(/(\d+)\s+failed/i);
      const passMatch = summaryLine.match(/(\d+)\s+passed/i);
      const totalMatch = summaryLine.match(/\((\d+)\)/);

      if (failMatch) failed = parseInt(failMatch[1], 10);
      if (passMatch) passed = parseInt(passMatch[1], 10);
      if (totalMatch) total = parseInt(totalMatch[1], 10);
      else total = passed + failed;
    } else {
      const passedMatch = cleanCombined.match(/(\d+)\s+passed/i);
      const failedMatch = cleanCombined.match(/(\d+)\s+failed/i);
      if (passedMatch) passed = parseInt(passedMatch[1], 10);
      if (failedMatch) failed = parseInt(failedMatch[1], 10);
      total = passed + failed;
    }

    // Extract individual test failures
    // Vitest failure blocks usually start with "FAIL " or "× "
    const lines = cleanCombined.split('\n');
    let currentFailure: Partial<ITestFailure> | null = null;
    let capturingError = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match failing test e.g. " ❯ src/tests/scenarios.test.ts:78:3 > KaizenTrace Scenario 1: Permission Regression > Should reject..."
      // Or "× Should reject Viewer updating a task..."
      const failHeaderMatch = line.match(/(?:❯|×|FAIL)\s+(.+?)(?:>|\:|\s{2,})(.*)/);
      if (failHeaderMatch) {
        if (currentFailure && currentFailure.testName) {
          failures.push(currentFailure as ITestFailure);
        }
        const suiteCandidate = failHeaderMatch[1].trim();
        const testCandidate = (failHeaderMatch[2] || '').trim();
        currentFailure = {
          suite: suiteCandidate,
          testName: testCandidate || suiteCandidate,
          error: '',
          stack: '',
        };
        capturingError = true;
        continue;
      }

      // Check for AssertionError or Error line
      if (capturingError && currentFailure) {
        if (line.includes('AssertionError:') || line.includes('Error:') || line.includes('expected') || line.includes('received')) {
          if (!currentFailure.error) {
            currentFailure.error = line.trim();
          } else {
            currentFailure.error += `\n${line.trim()}`;
          }
        }

        // Capture stack lines
        if (line.trim().startsWith('at ') || line.includes('src/')) {
          currentFailure.stack = (currentFailure.stack || '') + (currentFailure.stack ? '\n' : '') + line.trim();
        }

        // Extract expected and received values
        const expMatch = line.match(/expected\s+([\w\d'"]+)/i);
        if (expMatch && !currentFailure.expected) currentFailure.expected = expMatch[1];
        const recMatch = line.match(/received\s+([\w\d'"]+)/i);
        if (recMatch && !currentFailure.received) currentFailure.received = recMatch[1];

        // End of error block
        if (line.includes('Test Files') || line.includes('⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯')) {
          capturingError = false;
        }
      }
    }

    if (currentFailure && currentFailure.testName) {
      failures.push(currentFailure as ITestFailure);
    }

    // If exit code != 0 but failed count is 0, extract top error
    if (exitCode !== 0 && failed === 0) {
      failed = 1;
      total = Math.max(total, 1);
      failures.push({
        testName: 'Test Execution Error',
        suite: 'Vitest Runtime',
        error: stderr || stdout.slice(-500) || 'Vitest process exited with non-zero status',
      });
    }

    return {
      total,
      passed,
      failed,
      durationMs,
      failures,
      rawSummary: cleanCombined.slice(-1500),
    };
  }
}
