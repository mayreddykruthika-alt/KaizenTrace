import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { IChangedFile } from '../models/types.js';

const execFileAsync = promisify(execFile);

export class GitService {
  /**
   * Run a Git CLI command inside the target project directory safely with argument array (no shell injection)
   */
  static async runGit(projectDir: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const { stdout, stderr } = await execFileAsync('git', args, {
        cwd: projectDir,
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024,
      });
      return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
    } catch (err: any) {
      return {
        stdout: (err.stdout || '').trim(),
        stderr: (err.stderr || err.message || '').trim(),
        exitCode: err.code || 1,
      };
    }
  }

  /**
   * Validate that the project directory exists and has expected Git and code structure
   */
  static async validateProjectDirectory(projectDir: string): Promise<{
    isValid: boolean;
    hasGit: boolean;
    hasBackend: boolean;
    hasPackageJson: boolean;
    error?: string;
  }> {
    if (!fs.existsSync(projectDir)) {
      return {
        isValid: false,
        hasGit: false,
        hasBackend: false,
        hasPackageJson: false,
        error: `Project directory does not exist at '${projectDir}'`,
      };
    }

    const hasGit = fs.existsSync(path.join(projectDir, '.git')) || fs.existsSync(path.join(projectDir, '..', '.git'));
    const hasPackageJson = fs.existsSync(path.join(projectDir, 'package.json'));
    const hasBackend = fs.existsSync(path.join(projectDir, 'backend'));

    const isValid = hasGit && hasPackageJson && hasBackend;
    return {
      isValid,
      hasGit,
      hasBackend,
      hasPackageJson,
      error: isValid ? undefined : 'Directory is missing .git, package.json, or backend folder',
    };
  }

  /**
   * Get current Git baseline / commit information
   */
  static async getCommitInfo(projectDir: string): Promise<{
    commitHash: string;
    branch: string;
    isClean: boolean;
    uncommittedCount: number;
  }> {
    const hashRes = await this.runGit(projectDir, ['rev-parse', 'HEAD']);
    const branchRes = await this.runGit(projectDir, ['rev-parse', '--abbrev-ref', 'HEAD']);
    const statusRes = await this.runGit(projectDir, ['status', '--porcelain']);

    const uncommittedLines = statusRes.stdout
      ? statusRes.stdout.split('\n').filter(l => l.trim().length > 0)
      : [];

    return {
      commitHash: hashRes.stdout || 'unknown',
      branch: branchRes.stdout || 'main',
      isClean: uncommittedLines.length === 0,
      uncommittedCount: uncommittedLines.length,
    };
  }

  /**
   * Detect working tree code changes using git status and git diff
   */
  static async detectChanges(projectDir: string): Promise<{
    changedFiles: IChangedFile[];
    rawStatus: string;
    rawDiff: string;
    hasChanges: boolean;
  }> {
    const statusRes = await this.runGit(projectDir, ['status', '--porcelain']);
    const diffRes = await this.runGit(projectDir, ['diff', '--unified=5']);
    const nameOnlyRes = await this.runGit(projectDir, ['diff', '--name-only']);

    const changedFiles: IChangedFile[] = [];
    const modifiedFileList = nameOnlyRes.stdout
      ? nameOnlyRes.stdout.split('\n').map(s => s.trim()).filter(Boolean)
      : [];

    for (const file of modifiedFileList) {
      // Get file specific diff
      const fileDiffRes = await this.runGit(projectDir, ['diff', '--unified=5', '--', file]);
      const patch = fileDiffRes.stdout;

      // Count insertions and deletions
      let insertions = 0;
      let deletions = 0;
      const lines = patch.split('\n');
      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) insertions++;
        if (line.startsWith('-') && !line.startsWith('---')) deletions++;
      }

      changedFiles.push({
        file: file.replace(/\\/g, '/'),
        status: 'modified',
        insertions,
        deletions,
        patch,
        diffUnified5: patch,
      });
    }

    // Also include untracked new files from porcelain
    const statusLines = statusRes.stdout
      ? statusRes.stdout.split('\n').filter(l => l.trim().length > 0)
      : [];

    for (const statusLine of statusLines) {
      const code = statusLine.substring(0, 2).trim();
      const filename = statusLine.substring(3).trim().replace(/\\/g, '/');
      if (code === '??' && !changedFiles.some(c => c.file === filename)) {
        changedFiles.push({
          file: filename,
          status: 'added',
          insertions: 0,
          deletions: 0,
          patch: `New untracked file: ${filename}`,
          diffUnified5: `New untracked file: ${filename}`,
        });
      }
    }

    return {
      changedFiles,
      rawStatus: statusRes.stdout,
      rawDiff: diffRes.stdout,
      hasChanges: changedFiles.length > 0,
    };
  }
}
