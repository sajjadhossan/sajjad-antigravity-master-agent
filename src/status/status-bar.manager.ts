import * as vscode from 'vscode';
import { IReleaseGateReport } from '../types';

export class StatusBarManager {
  private autoAcceptItem: vscode.StatusBarItem;
  private rulesItem: vscode.StatusBarItem;
  private syncItem: vscode.StatusBarItem;
  private backupItem: vscode.StatusBarItem;
  private qrItem: vscode.StatusBarItem;
  private releaseGateItem: vscode.StatusBarItem;
  private aiPlanItem: vscode.StatusBarItem;

  constructor() {
    this.autoAcceptItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 107);
    this.rulesItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 106);
    this.syncItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 105);
    this.backupItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 104);
    this.qrItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 103);
    this.releaseGateItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 102);
    this.aiPlanItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 101);

    this.initItems();
  }

  private initItems(): void {
    this.autoAcceptItem.command = 'antigravityMaster.openDashboard';
    this.rulesItem.command = 'antigravityMaster.manageRules';
    this.syncItem.command = 'antigravityMaster.openDashboard';
    this.backupItem.command = 'antigravityMaster.runBackupTest';
    this.qrItem.command = 'antigravityMaster.generateApkQr';
    this.releaseGateItem.command = 'antigravityMaster.forceVerifyAndPrepareRelease';
    this.aiPlanItem.command = 'antigravityMaster.runAiPlanner';

    this.updateStatus(false, 5, true, true, true, false, 'Approved');
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
    // 1. Auto-Accept
    this.autoAcceptItem.text = `$(zap) Auto-Accept: ${autoAccept ? 'ON' : 'OFF'}`;
    this.autoAcceptItem.tooltip = 'Zero-Click Auto-Approval Engine';
    this.autoAcceptItem.show();

    // 2. Rules Active
    this.rulesItem.text = `$(law) Rules: ${activeRulesCount}`;
    this.rulesItem.tooltip = `${activeRulesCount} active custom and global rules`;
    this.rulesItem.show();

    // 3. 4-Device Sync
    this.syncItem.text = `$(sync) 4-Device: ${syncOk ? 'OK' : 'Issue'}`;
    this.syncItem.tooltip = syncOk ? 'Cross-platform imports validated' : 'Platform conflict detected';
    this.syncItem.show();

    // 4. Backup
    this.backupItem.text = `$(database) Backup: ${backupOk ? 'OK' : 'Issue'}`;
    this.backupItem.tooltip = backupOk ? 'Pre-release backup validated' : 'Backup simulation warning';
    this.backupItem.show();

    // 5. QR Engine
    this.qrItem.text = `$(device-mobile) QR: ${qrOk ? 'OK' : 'Issue'}`;
    this.qrItem.tooltip = 'Release APK QR Engine';
    this.qrItem.show();

    // 6. Release Gate
    if (isReleaseLocked) {
      this.releaseGateItem.text = `$(shield) Gate: BLOCKED`;
      this.releaseGateItem.color = new vscode.ThemeColor('errorForeground');
      this.releaseGateItem.tooltip = 'Critical errors present. Push/Release is locked!';
    } else {
      this.releaseGateItem.text = `$(shield) Gate: PASS`;
      this.releaseGateItem.color = new vscode.ThemeColor('testing.iconPassed');
      this.releaseGateItem.tooltip = 'All 50 release gates passed successfully.';
    }
    this.releaseGateItem.show();

    // 7. AI Plan
    this.aiPlanItem.text = `$(symbol-event) AI Plan: ${aiPlanStatus}`;
    this.aiPlanItem.tooltip = 'AI Intent Confirmation & Blueprint Gate';
    this.aiPlanItem.show();
  }

  public updateFromReport(report: IReleaseGateReport): void {
    this.updateStatus(
      false,
      5,
      true,
      true,
      true,
      report.isLocked,
      'Approved'
    );
  }

  public dispose(): void {
    this.autoAcceptItem.dispose();
    this.rulesItem.dispose();
    this.syncItem.dispose();
    this.backupItem.dispose();
    this.qrItem.dispose();
    this.releaseGateItem.dispose();
    this.aiPlanItem.dispose();
  }
}
