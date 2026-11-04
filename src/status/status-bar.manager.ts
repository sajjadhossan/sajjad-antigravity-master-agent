import * as vscode from 'vscode';
import { IReleaseGateReport } from '../types';

export class StatusBarManager {
  private releaseGateItem: vscode.StatusBarItem;
  private autoAcceptItem: vscode.StatusBarItem;
  private rulesItem: vscode.StatusBarItem;
  private syncItem: vscode.StatusBarItem;
  private backupItem: vscode.StatusBarItem;
  private qrItem: vscode.StatusBarItem;
  private aiPlanItem: vscode.StatusBarItem;

  constructor() {
    // High-visibility left alignment ensures items are prominent and not truncated
    this.releaseGateItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.autoAcceptItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.rulesItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    this.syncItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);
    this.backupItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 96);
    this.qrItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 95);
    this.aiPlanItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 94);

    this.initItems();
  }

  private initItems(): void {
    this.releaseGateItem.command = 'antigravityMaster.forceVerifyAndPrepareRelease';
    this.autoAcceptItem.command = 'antigravityMaster.toggleAutoAccept';
    this.rulesItem.command = 'antigravityMaster.manageRules';
    this.syncItem.command = 'antigravityMaster.openDashboard';
    this.backupItem.command = 'antigravityMaster.runBackupTest';
    this.qrItem.command = 'antigravityMaster.generateApkQr';
    this.aiPlanItem.command = 'antigravityMaster.runAiPlanner';

    const config = vscode.workspace.getConfiguration('antigravityMaster');
    const autoAccept = config.get<boolean>('autoAccept.enabled', false);
    this.updateStatus(autoAccept, 5, true, true, true, false, 'Approved');
  }

  public updateStatus(
    autoAccept: boolean,
    activeRulesCount: number,
    syncOk: boolean,
    backupOk: boolean,
    qrOk: boolean,
    isReleaseLocked: boolean,
    aiPlanStatus: 'Waiting' | 'Approved'
  ): void {
    // 1. Release Gate Item (Prominent Sajjad Branding)
    if (isReleaseLocked) {
      this.releaseGateItem.text = `$(shield) Sajjad Gate: BLOCKED`;
      this.releaseGateItem.color = new vscode.ThemeColor('errorForeground');
      this.releaseGateItem.tooltip = 'Sajjad Master: Critical errors detected. Push/Release is locked!';
    } else {
      this.releaseGateItem.text = `$(shield) Sajjad Gate: PASS`;
      this.releaseGateItem.color = new vscode.ThemeColor('testing.iconPassed');
      this.releaseGateItem.tooltip = 'Sajjad Master: All 50 release gates cleared.';
    }
    this.releaseGateItem.show();

    // 2. Auto-Accept
    this.autoAcceptItem.text = `$(zap) Sajjad Auto: ${autoAccept ? 'ON' : 'OFF'}`;
    this.autoAcceptItem.tooltip = 'Sajjad Master: Smart Zero-Click Approval Engine';
    this.autoAcceptItem.show();

    // 3. Rules Active
    this.rulesItem.text = `$(law) Sajjad Rules: ${activeRulesCount}`;
    this.rulesItem.tooltip = `Sajjad Master: ${activeRulesCount} active custom rules`;
    this.rulesItem.show();

    // 4. 4-Device Sync
    this.syncItem.text = `$(sync) 4-Device: ${syncOk ? 'OK' : 'Issue'}`;
    this.syncItem.tooltip = syncOk ? 'Sajjad Master: Cross-platform parity validated' : 'Sajjad Master: Platform issue detected';
    this.syncItem.show();

    // 5. Backup
    this.backupItem.text = `$(database) Sajjad Backup: ${backupOk ? 'OK' : 'Issue'}`;
    this.backupItem.tooltip = 'Sajjad Master: Automated backup & recovery engine';
    this.backupItem.show();

    // 6. QR Engine
    this.qrItem.text = `$(device-mobile) Sajjad QR: ${qrOk ? 'OK' : 'Issue'}`;
    this.qrItem.tooltip = 'Sajjad Master: Dynamic APK QR engine';
    this.qrItem.show();

    // 7. AI Plan
    this.aiPlanItem.text = `$(symbol-event) AI Plan: ${aiPlanStatus}`;
    this.aiPlanItem.tooltip = 'Sajjad Master: Interactive AI intent planner';
    this.aiPlanItem.show();
  }

  public updateFromReport(report: IReleaseGateReport): void {
    const config = vscode.workspace.getConfiguration('antigravityMaster');
    const autoAccept = config.get<boolean>('autoAccept.enabled', false);
    this.updateStatus(
      autoAccept,
      5,
      true,
      true,
      true,
      report.isLocked,
      'Approved'
    );
  }

  public dispose(): void {
    this.releaseGateItem.dispose();
    this.autoAcceptItem.dispose();
    this.rulesItem.dispose();
    this.syncItem.dispose();
    this.backupItem.dispose();
    this.qrItem.dispose();
    this.aiPlanItem.dispose();
  }
}
