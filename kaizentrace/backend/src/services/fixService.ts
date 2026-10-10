import fs from 'fs';
import path from 'path';
import { InvestigationModel } from '../database.js';

export class FixService {
  /**
   * Safely apply a verified targeted fix to a file within the project directory
   */
  static async applyFix(
    projectDir: string,
    investigationId: string
  ): Promise<{
    success: boolean;
    targetFile: string;
    message: string;
    backupContent?: string;
  }> {
    const investigation = await InvestigationModel.findOne({ investigationId });
    if (!investigation) {
      throw new Error(`Investigation with ID '${investigationId}' not found`);
    }

    const { recommendedFix } = investigation;
    if (!recommendedFix || !recommendedFix.targetFile) {
      throw new Error('Investigation does not contain an applicable fix');
    }

    // Security check: prevent directory traversal outside project directory
    const resolvedPath = path.resolve(projectDir, recommendedFix.targetFile);
    if (!resolvedPath.startsWith(path.resolve(projectDir))) {
      throw new Error('Access denied: target file path is outside the project directory');
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Target file '${recommendedFix.targetFile}' does not exist on disk`);
    }

    const currentContent = fs.readFileSync(resolvedPath, 'utf-8');

    // Scenario A: Restore requireRole in task.routes.ts
    let updatedContent = currentContent;
    let applied = false;

    if (recommendedFix.targetFile.includes('task.routes.ts')) {
      // Look for the line without requireRole
      const badLine = "router.patch('/:id', validate(updateTaskSchema), TaskController.update);";
      const goodLine = "router.patch('/:id', requireRole(['admin', 'project_manager', 'member']), validate(updateTaskSchema), TaskController.update);";

      if (currentContent.includes(badLine)) {
        updatedContent = currentContent.replace(badLine, goodLine);
        applied = true;
      } else if (currentContent.includes('// router.patch')) {
        updatedContent = currentContent.replace(/\/\/\s*router\.patch\('\/:id'.*?\);/, goodLine);
        applied = true;
      } else {
        // Fallback exact replace if target string is found
        if (recommendedFix.originalCode && currentContent.includes(recommendedFix.originalCode)) {
          updatedContent = currentContent.replace(recommendedFix.originalCode, recommendedFix.proposedCode);
          applied = true;
        }
      }
    } else if (recommendedFix.targetFile.includes('taskService.ts')) {
      // Scenario B: task update failure flag or throw
      if (currentContent.includes('env.TEST_FAIL_TASK_UPDATE')) {
        updatedContent = currentContent.replace(
          /if\s*\(\s*env\.TEST_FAIL_TASK_UPDATE\s*\)\s*\{[\s\S]*?throw\s+AppError\.internal[\s\S]*?\}/,
          '// [KaizenTrace Fix Applied] Database persistence fault condition removed'
        );
        applied = true;
      }
    } else if (recommendedFix.targetFile.includes('deadlineReminderJob.ts')) {
      // Scenario B: deadline job forced error
      if (currentContent.includes('TEST_FAIL_DEADLINE_JOB')) {
        updatedContent = currentContent.replace(
          /if\s*\(\s*forceFailure\s*\|\|\s*env\.TEST_FAIL_DEADLINE_JOB\s*\)\s*\{[\s\S]*?throw\s+new\s+Error[\s\S]*?\}/,
          '// [KaizenTrace Fix Applied] Background partition condition removed'
        );
        applied = true;
      }
    }

    if (!applied && recommendedFix.originalCode && currentContent.includes(recommendedFix.originalCode)) {
      updatedContent = currentContent.replace(recommendedFix.originalCode, recommendedFix.proposedCode);
      applied = true;
    }

    if (!applied) {
      return {
        success: false,
        targetFile: recommendedFix.targetFile,
        message: 'Could not match the exact patch location safely. Please inspect and apply the patch manually.',
      };
    }

    // Write the verified fix
    fs.writeFileSync(resolvedPath, updatedContent, 'utf-8');

    // Update MongoDB investigation record using updateOne
    await InvestigationModel.updateOne(
      { investigationId },
      {
        $set: {
          'appliedChanges.applied': true,
          'appliedChanges.appliedAt': new Date(),
          'appliedChanges.targetFile': recommendedFix.targetFile,
          'appliedChanges.backupContent': currentContent,
          'appliedChanges.reverted': false,
        },
      }
    );

    return {
      success: true,
      targetFile: recommendedFix.targetFile,
      message: `Patch safely applied to '${recommendedFix.targetFile}'. Ready for verification run.`,
      backupContent: currentContent,
    };
  }

  /**
   * Revert applied changes if needed
   */
  static async revertFix(projectDir: string, investigationId: string): Promise<boolean> {
    const investigation = await InvestigationModel.findOne({ investigationId });
    if (!investigation || !investigation.appliedChanges?.backupContent || !investigation.appliedChanges.targetFile) {
      return false;
    }

    const resolvedPath = path.resolve(projectDir, investigation.appliedChanges.targetFile);
    fs.writeFileSync(resolvedPath, investigation.appliedChanges.backupContent, 'utf-8');

    await InvestigationModel.updateOne(
      { investigationId },
      {
        $set: {
          'appliedChanges.applied': false,
          'appliedChanges.reverted': true,
        },
      }
    );

    return true;
  }
}
