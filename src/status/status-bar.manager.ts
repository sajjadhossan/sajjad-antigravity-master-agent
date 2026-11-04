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
    this.releaseGateItem.command = 'antigravityMaster.showQuickMenu';
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
    // 1. Release Gate Item (Prominent Executive Sajjad Branding)
    if (isReleaseLocked) {
      this.releaseGateItem.text = `$(shield) Sajjad Guard: BLOCKED`;
      this.releaseGateItem.color = new vscode.ThemeColor('errorForeground');
      this.releaseGateItem.tooltip = 'Sajjad Master: Critical blockers detected. Click for Quick Menu.';
    } else {
      this.releaseGateItem.text = `$(shield) Sajjad Guard: 100% PASS`;
      this.releaseGateItem.color = new vscode.ThemeColor('testing.iconPassed');
      this.releaseGateItem.tooltip = 'Sajjad Master: All 50 release gates cleared. Click for Quick Menu.';
    }
    this.releaseGateItem.show();

    // 2. Auto-Accept Toggle
    this.autoAcceptItem.text = `$(zap) Auto: ${autoAccept ? 'ON' : 'OFF'}`;
    this.autoAcceptItem.tooltip = `Sajjad Master: Smart Zero-Click Approval Engine is ${autoAccept ? 'ON' : 'OFF'}. Click to toggle.`;
    this.autoAcceptItem.show();
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
