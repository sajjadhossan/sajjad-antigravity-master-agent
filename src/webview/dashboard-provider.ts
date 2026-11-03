import * as vscode from 'vscode';
import { ModuleRegistry } from '../core/module-registry';
import { ReleaseGateService } from '../release/release-gate.service';
import { LocalizationService } from '../i18n/localization.service';
import { RulesEngine } from '../rules/rules-engine';
import { getDashboardHtml } from './dashboard-html';

export class DashboardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'antigravityMaster.dashboardView';
  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    this.render();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'forceVerify':
          await vscode.commands.executeCommand('antigravityMaster.forceVerifyAndPrepareRelease');
          this.render();
          break;
        case 'toggleLang':
          const loc = LocalizationService.getInstance();
          loc.setLanguage(loc.getLanguage() === 'bn' ? 'en' : 'bn');
          this.render();
          break;
        case 'openSettings':
          await vscode.commands.executeCommand('workbench.action.openSettings', 'antigravityMaster');
          break;
        case 'applyTemplate':
          if (message.templateId) {
            await RulesEngine.getInstance().applyTemplate(message.templateId);
            vscode.window.showInformationMessage(`Applied template: ${message.templateId}`);
            this.render();
          }
          break;
        case 'runModule':
          const mod = ModuleRegistry.getInstance().getModule(message.moduleNumber);
          if (mod) {
            await ModuleRegistry.getInstance().scanSingleModule(message.moduleNumber);
            this.render();
          }
          break;
        case 'toggleModule':
          if (typeof message.moduleNumber === 'number') {
            await ModuleRegistry.getInstance().toggleModule(message.moduleNumber);
            this.render();
          }
          break;
        case 'runPlanner':
          await vscode.commands.executeCommand('antigravityMaster.runAiPlanner');
          break;
        case 'approvePlan':
          await vscode.commands.executeCommand('antigravityMaster.approvePlan');
          break;
        case 'rejectPlan':
          await vscode.commands.executeCommand('antigravityMaster.rejectPlan');
          break;
        case 'runBackupTest':
          await vscode.commands.executeCommand('antigravityMaster.runBackupTest');
          break;
        case 'generateQr':
          await vscode.commands.executeCommand('antigravityMaster.generateApkQr');
          break;
        case 'scanManifest':
          await vscode.commands.executeCommand('antigravityMaster.scanAndroidManifest');
          break;
        case 'bumpVersion':
          await vscode.commands.executeCommand('antigravityMaster.bumpVersion');
          break;
        case 'generateCiWorkflows':
          await vscode.commands.executeCommand('antigravityMaster.generateWorkflows');
          break;
        case 'scanSecrets':
          await vscode.commands.executeCommand('antigravityMaster.scanSecrets');
          break;
        case 'scanDependencies':
          await vscode.commands.executeCommand('antigravityMaster.scanDependencies');
          break;
        case 'openMemoryFile':
          const memPath = vscode.workspace.workspaceFolders?.[0]
            ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, '.project-memory.json')
            : undefined;
          if (memPath) {
            const doc = await vscode.workspace.openTextDocument(memPath);
            await vscode.window.showTextDocument(doc);
          }
          break;
        case 'runSelfDiagnostic':
          await vscode.commands.executeCommand('antigravityMaster.runSelfDiagnostic');
          break;
        case 'exportReport':
          await vscode.commands.executeCommand('antigravityMaster.exportDiagnosticReport');
          break;
      }
    });
  }

  public render(): void {
    if (this.view) {
      const results = ModuleRegistry.getInstance().getAllResults();
      const lastReport = ReleaseGateService.getInstance().getLastReport();
      const isLocked = lastReport ? lastReport.isLocked : false;
      this.view.webview.html = getDashboardHtml(results, isLocked);
    }
  }
}
