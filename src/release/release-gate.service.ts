import * as vscode from 'vscode';
import { ModuleRegistry } from '../core/module-registry';
import { IModuleIssue, IReleaseGateReport, ModuleStatus } from '../types';

export class ReleaseGateService {
  private static instance: ReleaseGateService;
  private lastReport?: IReleaseGateReport;

  private constructor() {}

  public static getInstance(): ReleaseGateService {
    if (!ReleaseGateService.instance) {
      ReleaseGateService.instance = new ReleaseGateService();
    }
    return ReleaseGateService.instance;
  }

  public async evaluateRelease(): Promise<IReleaseGateReport> {
    const results = await ModuleRegistry.getInstance().runFullScan();
    const config = vscode.workspace.getConfiguration('antigravityMaster');
    const blockOnWarnings = config.get<boolean>('releaseGate.blockOnWarnings', false);

    const blockers: IModuleIssue[] = [];
    const warnings: IModuleIssue[] = [];
    let passedCount = 0;

    for (const res of results) {
      if (res.status === ModuleStatus.WORKING) {
        passedCount++;
      }

      for (const issue of res.issues) {
        if (issue.severity === 'CRITICAL' || issue.severity === 'HIGH') {
          blockers.push(issue);
        } else {
          warnings.push(issue);
        }
      }
    }

    const isLocked = blockers.length > 0 || (blockOnWarnings && warnings.length > 0);

    let summaryText = `🛡️ RELEASE GATE REPORT\n` +
      `Total Modules Checked: ${results.length}\n` +
      `🟢 Passed: ${passedCount}\n` +
      `🟡 Warnings: ${warnings.length}\n` +
      `🔴 Blockers: ${blockers.length}\n\n`;

    if (blockers.length > 0) {
      summaryText += `Blockers:\n`;
      blockers.forEach((b, idx) => {
        summaryText += `${idx + 1}. Module ${b.moduleNumber} — ${b.message}\n` +
          `   Fix: ${b.remediation || 'Resolve before release.'}\n`;
      });
    } else {
      summaryText += `All critical release gates cleared. Safe for CI/CD build and delivery.`;
    }

    this.lastReport = {
      timestamp: new Date().toISOString(),
      totalModules: results.length,
      passedCount,
      warningCount: warnings.length,
      blockerCount: blockers.length,
      isLocked,
      blockers,
      warnings,
      summaryText,
    };

    return this.lastReport;
  }

  public getLastReport(): IReleaseGateReport | undefined {
    return this.lastReport;
  }
}
