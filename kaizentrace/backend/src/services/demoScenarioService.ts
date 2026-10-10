import fs from 'fs';
import path from 'path';
import { GitService } from './gitService.js';

export class DemoScenarioService {
  /**
   * Inject Scenario A: Permission regression
   * Removes `requireRole(['admin', 'project_manager', 'member'])` from task.routes.ts line 17
   */
  static async injectScenarioA(projectDir: string): Promise<{ success: boolean; message: string }> {
    const routeFile = path.join(projectDir, 'backend', 'src', 'routes', 'task.routes.ts');
    if (!fs.existsSync(routeFile)) {
      return { success: false, message: `File not found: ${routeFile}` };
    }

    const content = fs.readFileSync(routeFile, 'utf-8');
    const goodLine = "router.patch('/:id', requireRole(['admin', 'project_manager', 'member']), validate(updateTaskSchema), TaskController.update);";
    const regressedLine = "router.patch('/:id', validate(updateTaskSchema), TaskController.update);";

    if (!content.includes(goodLine)) {
      if (content.includes(regressedLine)) {
        return { success: true, message: 'Scenario A (Permission Regression) is already active in task.routes.ts' };
      }
      return { success: false, message: 'Could not locate target line in task.routes.ts' };
    }

    const newContent = content.replace(goodLine, regressedLine);
    fs.writeFileSync(routeFile, newContent, 'utf-8');

    return {
      success: true,
      message: 'Scenario A injected: Removed requireRole authorization middleware from PATCH /api/tasks/:id in task.routes.ts',
    };
  }

  /**
   * Inject Scenario B: Database persistence failure
   * Injects simulated failure block in taskService.ts
   */
  static async injectScenarioB(projectDir: string): Promise<{ success: boolean; message: string }> {
    const serviceFile = path.join(projectDir, 'backend', 'src', 'services', 'taskService.ts');
    if (!fs.existsSync(serviceFile)) {
      return { success: false, message: `File not found: ${serviceFile}` };
    }

    const content = fs.readFileSync(serviceFile, 'utf-8');
    const triggerMarker = 'const task = await Task.findById(id);';
    const failureInjection = `// [FAULT_INJECTION] Simulated database persistence failure
    if (true) {
      logger.error({ taskId: id }, '[FAULT_INJECTION] Simulated database persistence failure between update and audit recording');
      throw AppError.internal('Database write error during task state transaction', 'DATABASE_ERROR');
    }
    const task = await Task.findById(id);`;

    if (content.includes('[FAULT_INJECTION] Simulated database persistence failure')) {
      return { success: true, message: 'Scenario B (Task Persistence Failure) is already active in taskService.ts' };
    }

    if (!content.includes(triggerMarker)) {
      return { success: false, message: 'Could not locate target hook in taskService.ts' };
    }

    const newContent = content.replace(triggerMarker, failureInjection);
    fs.writeFileSync(serviceFile, newContent, 'utf-8');

    return {
      success: true,
      message: 'Scenario B injected: Simulated database persistence failure in taskService.ts updateTask method',
    };
  }

  /**
   * Reset TeamFlow back to clean Git HEAD
   */
  static async resetToBaseline(projectDir: string): Promise<{ success: boolean; message: string }> {
    const res = await GitService.runGit(projectDir, ['checkout', '--', '.']);
    return {
      success: res.exitCode === 0,
      message: res.exitCode === 0
        ? 'TeamFlow working tree successfully restored to pristine Git baseline.'
        : `Git checkout failed: ${res.stderr}`,
    };
  }
}
