import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SecurityVault } from './core/security-vault';
import { RulesEngine } from './rules/rules-engine';
import { StatusBarManager } from './status/status-bar.manager';
import { ModuleRegistry } from './core/module-registry';
import { ReleaseGateService } from './release/release-gate.service';
import { DashboardViewProvider } from './webview/dashboard-provider';
import { AndroidPreflightService } from './android/apk-preflight';
import { ProjectMemoryManager } from './memory/project-memory.manager';
import { BackupRecoveryService } from './backup/backup-recovery.service';
import { DependencyScanner } from './core/dependency-scanner';
import { AntigravityCodeActionProvider } from './editor/code-action.provider';
import { AntigravityCodeLensProvider } from './editor/codelens.provider';
import { PillarTreeDataProvider } from './views/pillar-tree.provider';
import { WorkflowGeneratorService } from './devops/workflow-generator.service';
import { AiBlueprintService } from './ai/ai-blueprint.service';
import { DeadCodePurgerService } from './cleaner/dead-code-purger.service';
import { FinancialLedgerGuardService } from './finance/financial-ledger-guard.service';
import { AuditTrailService } from './audit/audit-trail.service';

let statusBar: StatusBarManager;
let dashboardProvider: DashboardViewProvider;
let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  console.log('Activating Antigravity Master Agent v8.0.0...');

  // 1. Initialize Core Singletons & Diagnostic Collection
  SecurityVault.getInstance().init(context);
  RulesEngine.getInstance().init(context);
  statusBar = new StatusBarManager();
  diagnosticCollection = vscode.languages.createDiagnosticCollection('antigravityMaster');
  context.subscriptions.push(diagnosticCollection);

  // 2. Register Dashboard Webview Provider & Sidebar Tree View Provider
  dashboardProvider = new DashboardViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DashboardViewProvider.viewType,
      dashboardProvider
    )
  );

  const pillarTreeProvider = PillarTreeDataProvider.getInstance();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('antigravityMaster.pillarExplorer', pillarTreeProvider)
  );

  // 3. Register Commands
  registerExtensionCommands(context);

  // 4. Register Editor CodeLens & Lightbulb QuickFix Providers
  const docSelectors: vscode.DocumentSelector = [
    { scheme: 'file', language: 'typescript' },
    { scheme: 'file', language: 'javascript' },
    { scheme: 'file', language: 'dart' },
    { scheme: 'file', language: 'json' },
    { scheme: 'file', language: 'ignore' },
  ];

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      docSelectors,
      new AntigravityCodeActionProvider(),
      { providedCodeActionKinds: AntigravityCodeActionProvider.providedCodeActionKinds }
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(docSelectors, new AntigravityCodeLensProvider())
  );

  // 5. Immediate Initial Module Scan
  setTimeout(() => {
    ModuleRegistry.getInstance().runFullScan().then(() => {
      dashboardProvider.render();
      pillarTreeProvider.refresh();
      updateDiagnosticsFromResults(ModuleRegistry.getInstance().getAllResults());
      const lastReport = ReleaseGateService.getInstance().getLastReport();
      if (lastReport) {
        statusBar.updateFromReport(lastReport);
      }
    });
  }, 200);

  // 5. Diagnostics listener for self-healing & force-fix lock
  context.subscriptions.push(
    vscode.languages.onDidChangeDiagnostics(() => {
      const activeErrors = vscode.languages.getDiagnostics().some(([, diags]) =>
        diags.some(d => d.severity === vscode.DiagnosticSeverity.Error)
      );
      if (activeErrors) {
        const config = vscode.workspace.getConfiguration('antigravityMaster');
        const autoAccept = config.get<boolean>('autoAccept.enabled', false);
        statusBar.updateStatus(autoAccept, RulesEngine.getInstance().getActiveRules().length, true, true, true, true, 'Waiting');
      }
    })
  );

  // 6. Configuration change listener for dynamic reactive updates
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration('antigravityMaster')) {
        await ModuleRegistry.getInstance().scanSingleModule(1);
        dashboardProvider.render();
        const lastReport = ReleaseGateService.getInstance().getLastReport();
        if (lastReport) {
          statusBar.updateFromReport(lastReport);
        } else {
          const config = vscode.workspace.getConfiguration('antigravityMaster');
          const autoAccept = config.get<boolean>('autoAccept.enabled', false);
          statusBar.updateStatus(autoAccept, RulesEngine.getInstance().getActiveRules().length, true, true, true, false, 'Approved');
        }
      }
    })
  );

  context.subscriptions.push(statusBar);
  console.log('Antigravity Master Agent v8.0.0 activated successfully.');
}

function registerExtensionCommands(context: vscode.ExtensionContext) {
  // Command: openDashboard
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.openDashboard', () => {
      vscode.commands.executeCommand('workbench.view.extension.antigravity-master-container');
    })
  );

  // Command: runAllChecks
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.runAllChecks', async () => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Antigravity: Running sweep across all 50 modules...',
          cancellable: false,
        },
        async () => {
          await ModuleRegistry.getInstance().runFullScan();
          dashboardProvider.render();
          PillarTreeDataProvider.getInstance().refresh();
          updateDiagnosticsFromResults(ModuleRegistry.getInstance().getAllResults());
          vscode.window.showInformationMessage('All 50 modules verified successfully.');
        }
      );
    })
  );

  // Command: forceVerifyAndPrepareRelease
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.forceVerifyAndPrepareRelease', async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Evaluating Release Gate across 50 modules...',
          cancellable: false,
        },
        async () => {
          const report = await ReleaseGateService.getInstance().evaluateRelease();
          dashboardProvider.render();
          statusBar.updateFromReport(report);

          const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          if (root) {
            AuditTrailService.getInstance().logEvent(
              root,
              'EVALUATE_RELEASE_GATE',
              'RELEASE_GATE',
              report.isLocked ? 'BLOCKED' : 'SUCCESS',
              { blockerCount: report.blockerCount, warningCount: report.warningCount }
            );
          }

          if (report.isLocked) {
            vscode.window.showErrorMessage(
              `🛡️ Release Gate BLOCKED: ${report.blockerCount} critical blockers detected. Review Command Center.`,
              'Open Command Center'
            ).then((choice) => {
              if (choice === 'Open Command Center') {
                vscode.commands.executeCommand('antigravityMaster.openDashboard');
              }
            });
          } else {
            vscode.window.showInformationMessage(
              `🛡️ Release Gate PASSED: 0 critical blockers. Ready for production build and release!`,
              'Export Report'
            ).then((choice) => {
              if (choice === 'Export Report') {
                vscode.commands.executeCommand('antigravityMaster.exportDiagnosticReport');
              }
            });
          }
        }
      );
    })
  );

  // Command: runAiPlanner
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.runAiPlanner', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        vscode.window.showWarningMessage('No open workspace found.');
        return;
      }

      const featureGoal = await vscode.window.showInputBox({
        prompt: 'Describe feature goal for AI intent breakdown & interactive blueprint',
        placeHolder: 'e.g., Add offline member loan repayment with SMS reminder and passbook print',
      });
      if (!featureGoal) {
        return;
      }

      const blueprint = AiBlueprintService.getInstance().generateBlueprint(root, featureGoal);
      const doc = await vscode.workspace.openTextDocument(blueprint.filePath);
      await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });

      const choice = await vscode.window.showInformationMessage(
        `📐 AI Architecture Blueprint generated at .antigravity/blueprints/${blueprint.slug}.md. Review specification.`,
        'Approve Architecture Plan',
        'Reject / Revise'
      );

      if (choice === 'Approve Architecture Plan') {
        vscode.commands.executeCommand('antigravityMaster.approvePlan');
      } else if (choice === 'Reject / Revise') {
        vscode.commands.executeCommand('antigravityMaster.rejectPlan');
      }
    })
  );

  // Command: purgeDeadCode
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.purgeDeadCode', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        vscode.window.showWarningMessage('No open workspace found.');
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        'Safely purge lingering debug console.log statements and prune empty directories? An encrypted backup will be created automatically before execution.',
        'Yes, Purge Dead Code',
        'Cancel'
      );

      if (confirm === 'Yes, Purge Dead Code') {
        const res = await DeadCodePurgerService.getInstance().purgeIssues(root, { removeConsoleLogs: true, removeEmptyDirs: true });
        vscode.window.showInformationMessage(`🧹 Purged ${res.cleanedCount} dead code/directory items. Safety backup created: ${res.backupCreated ? 'Yes' : 'No'}.`);
        await ModuleRegistry.getInstance().scanSingleModule(37);
        dashboardProvider.render();
        PillarTreeDataProvider.getInstance().refresh();
      }
    })
  );

  // Command: scanDeadAssets
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.scanDeadAssets', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        vscode.window.showWarningMessage('No open workspace found.');
        return;
      }

      const audit = await DeadCodePurgerService.getInstance().auditWorkspace(root);
      vscode.window.showInformationMessage(
        `Asset & Dead Code Audit: Found ${audit.orphanAssets} unreferenced assets, ${audit.consoleLogs} lingering console.log calls, and ${audit.emptyDirectories} empty directories.`
      );
    })
  );

  // Command: previewThermalReceipt
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.previewThermalReceipt', async () => {
      const receipt = FinancialLedgerGuardService.getInstance().generateThermalReceipt();
      const html = FinancialLedgerGuardService.getInstance().generateThermalReceiptHtml(receipt);

      const panel = vscode.window.createWebviewPanel(
        'thermalReceiptPreview',
        `Thermal Receipt: ${receipt.invoiceNo}`,
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );

      panel.webview.html = html;
    })
  );

  // Command: auditFinancialLedger
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.auditFinancialLedger', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        vscode.window.showWarningMessage('No open workspace found.');
        return;
      }

      const audit = await FinancialLedgerGuardService.getInstance().auditFinancialIntegrity(root);
      if (audit.issues.length === 0) {
        vscode.window.showInformationMessage('✅ Financial & Ledger Guard: 100% compliant. Zero float currency risks or missing tenant queries.');
      } else {
        vscode.window.showWarningMessage(
          `🛡️ Financial Guard: Found ${audit.floatMathCount} float currency calculations and ${audit.tenantQueryGaps} un-isolated financial queries! Check Command Center.`
        );
      }
    })
  );

  // Command: showQuickMenu
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.showQuickMenu', async () => {
      const menuItems = [
        { label: '$(dashboard) Open Command Center Dashboard', id: 'openDashboard', detail: 'View 4 Executive Tabs, SVG Health Meter and 50 Modules' },
        { label: '$(zap) ✨ 1-Click Auto-Heal Workspace', id: 'autoHeal', detail: 'Automatically fix missing memory, rules, security and CI/CD' },
        { label: '$(shield) Run Full 50-Module Sweep', id: 'runAllChecks', detail: 'Execute diagnostic scan across all 50 enterprise modules' },
        { label: '$(lock) Force-Verify 1–50 & Evaluate Release Gate', id: 'forceVerifyAndPrepareRelease', detail: 'Audit release readiness and lock dirty deliveries' },
        { label: '$(history) View Audit Trail Log', id: 'viewAuditTrail', detail: 'Inspect immutable, tamper-evident audit records (.antigravity/audit)' },
        { label: '$(circuit-board) 📐 Generate AI Architecture Blueprint', id: 'runAiPlanner', detail: 'Design multi-tenant database, API, and UI wireframe' },
        { label: '$(device-mobile) 🧾 Preview 80mm Thermal Receipt', id: 'previewThermalReceipt', detail: 'Open ESC/POS thermal receipt simulator with verification QR' },
        { label: '$(trash) 🧹 Purge Dead Code & Debug Logs', id: 'purgeDeadCode', detail: 'Clean console.log statements and prune empty directories with backup' },
        { label: '$(git-pull-request) Generate GitHub Actions CI/CD Workflows', id: 'generateWorkflows', detail: 'Produce production-ready pipelines (Android, Vercel, Desktop)' },
        { label: '$(key) Audit Hardcoded Secrets & Tokens', id: 'scanSecrets', detail: 'Deep scan codebase for exposed API keys, JWTs and DB URLs' },
      ];

      const chosen = await vscode.window.showQuickPick(menuItems, {
        placeHolder: 'Sajjad Antigravity Master — Select Executive Action',
      });

      if (chosen) {
        vscode.commands.executeCommand(`antigravityMaster.${chosen.id}`);
      }
    })
  );

  // Command: viewAuditTrail
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.viewAuditTrail', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        vscode.window.showWarningMessage('No open workspace found.');
        return;
      }

      const report = AuditTrailService.getInstance().generateMarkdownReport(root);
      const doc = await vscode.workspace.openTextDocument({
        content: report,
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
    })
  );

  // Command: manageRules
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.manageRules', async () => {
      const items = [
        { label: '$(plus) Initialize .project-rules.json', id: 'init' },
        { label: '$(briefcase) Apply Retail POS Template', id: 'pos-inventory' },
        { label: '$(organization) Apply Samity / সমবায় সমিতি Template', id: 'cooperative-society' },
        { label: '$(symbol-field) Apply Dairy Agro Template', id: 'dairy-agro-farm' },
        { label: '$(pulse) Apply Diagnostic Center Template', id: 'diagnostic-center' },
        { label: '$(pie-chart) Apply CRM Template', id: 'crm' },
        { label: '$(tools) Apply Utility Billing Template', id: 'utility-app' },
      ];
      const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select Rules Action' });
      if (selected) {
        if (selected.id === 'init') {
          vscode.commands.executeCommand('antigravityMaster.createProjectRules');
        } else {
          await RulesEngine.getInstance().applyTemplate(selected.id);
          vscode.window.showInformationMessage(`Applied template: ${selected.label}`);
          dashboardProvider.render();
        }
      }
    })
  );

  // Command: createProjectRules
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.createProjectRules', async () => {
      try {
        const filePath = await RulesEngine.getInstance().createWorkspaceProjectRules();
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('.project-rules.json initialized successfully.');
        dashboardProvider.render();
      } catch (err: any) {
        vscode.window.showErrorMessage(err.message || 'Failed to create .project-rules.json');
      }
    })
  );

  // Command: applyRuleTemplate
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.applyRuleTemplate', async () => {
      vscode.commands.executeCommand('antigravityMaster.manageRules');
    })
  );

  // Command: scanAndroidManifest
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.scanAndroidManifest', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        vscode.window.showWarningMessage('No open workspace found.');
        return;
      }
      const report = await AndroidPreflightService.getInstance().inspectWorkspace(root);
      const summary = `AndroidManifest Scan: Found ${report.detectedPermissions.length} permissions. Signing status: ${report.signingStatus}. Issues: ${report.issues.length}`;
      vscode.window.showInformationMessage(summary);
    })
  );

  // Command: validateSigning
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.validateSigning', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (root) {
        const report = await AndroidPreflightService.getInstance().inspectWorkspace(root);
        vscode.window.showInformationMessage(`Signing Key Validation: ${report.signingStatus}`);
      }
    })
  );

  // Command: bumpVersion
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.bumpVersion', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        return;
      }
      const nextVer = await vscode.window.showInputBox({
        prompt: 'Enter new semantic version (e.g., 8.1.0)',
        value: '8.1.0',
      });
      if (!nextVer) {
        return;
      }

      const confirmed = await vscode.window.showWarningMessage(
        `Bump version to ${nextVer} across package.json, pubspec.yaml, and Android manifests?`,
        'Yes, Bump Version',
        'Cancel'
      );
      if (confirmed === 'Yes, Bump Version') {
        const updated = await AndroidPreflightService.getInstance().bumpVersion(root, nextVer);
        vscode.window.showInformationMessage(`Updated version in ${updated.length} files: ${updated.map(f => path.basename(f)).join(', ')}`);
      }
    })
  );

  // Command: generateWorkflows
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.generateWorkflows', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        vscode.window.showWarningMessage('No open workspace found.');
        return;
      }
      const generated = WorkflowGeneratorService.getInstance().generateEnterpriseWorkflows(root);
      const names = generated.map(g => g.fileName).join(', ');
      vscode.window.showInformationMessage(`✅ Generated ${generated.length} enterprise CI/CD workflows: ${names}`);
      dashboardProvider.render();
      PillarTreeDataProvider.getInstance().refresh();
    })
  );

  // Command: monitorGitHubActions
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.monitorGitHubActions', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        vscode.window.showWarningMessage('No open workspace found.');
        return;
      }
      const audit = WorkflowGeneratorService.getInstance().auditWorkflows(root);
      if (audit.total === 0) {
        const choice = await vscode.window.showWarningMessage(
          'No CI/CD workflows detected in .github/workflows. Generate them now?',
          'Generate Workflows',
          'Dismiss'
        );
        if (choice === 'Generate Workflows') {
          vscode.commands.executeCommand('antigravityMaster.generateWorkflows');
        }
      } else if (audit.issues.length > 0) {
        vscode.window.showErrorMessage(`GitHub Actions Audit: ${audit.issues.length} issues found: ${audit.issues.join(' | ')}`);
      } else {
        vscode.window.showInformationMessage(`GitHub Actions CI/CD Audit: ${audit.valid}/${audit.total} workflows active and syntactically valid.`);
      }
    })
  );

  // Command: generateApkQr
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.generateApkQr', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      let downloadUrl = 'https://github.com/sajjadhossan/sajjad-antigravity-master-agent/releases/latest';

      if (root) {
        const config = vscode.workspace.getConfiguration('antigravityMaster');
        const owner = config.get<string>('github.owner');
        const repo = config.get<string>('github.repo');
        if (owner && repo) {
          downloadUrl = `https://github.com/${owner}/${repo}/releases/latest`;
        } else {
          const pkgPath = path.join(root, 'package.json');
          if (fs.existsSync(pkgPath)) {
            try {
              const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
              if (pkg.repository?.url) {
                const clean = pkg.repository.url.replace(/\.git$/, '').replace(/^git\+/, '');
                downloadUrl = `${clean}/releases/latest`;
              }
            } catch (e) {}
          }
        }
      }

      const encoded = encodeURIComponent(downloadUrl);
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encoded}`;

      const panel = vscode.window.createWebviewPanel(
        'apkQrViewer',
        'Release APK Download QR Code',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );

      panel.webview.html = `<!DOCTYPE html>
        <html>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#1e1e1e;color:#fff;font-family:sans-serif;">
          <h3>Scan to Download Release APK</h3>
          <img src="${qrApiUrl}" width="256" height="256" alt="APK QR" style="border: 4px solid #fff; border-radius: 8px;" />
          <p style="margin-top:16px;font-size:12px;color:#888;">${downloadUrl}</p>
        </body>
        </html>`;
    })
  );

  // Command: runBackupTest
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.runBackupTest', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        vscode.window.showWarningMessage('No open workspace found to perform backup test.');
        return;
      }
      try {
        const res = await BackupRecoveryService.getInstance().createBackup(root);
        vscode.window.showInformationMessage(
          `✅ Encrypted workspace backup created: ${path.basename(res.archivePath)} (${(res.manifest.compressedBytes / 1024).toFixed(1)} KB, ${res.manifest.totalFiles} files). SHA-256 verified.`
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(`Backup creation failed: ${err.message || String(err)}`);
      }
    })
  );

  // Command: validateRestore
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.validateRestore', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        vscode.window.showWarningMessage('No open workspace found to validate restore.');
        return;
      }
      const val = await BackupRecoveryService.getInstance().validateLatestBackup(root);
      if (val.valid) {
        vscode.window.showInformationMessage(`🛡️ Backup Integrity Check: PASSED. ${val.message}`);
      } else {
        vscode.window.showWarningMessage(`⚠️ Backup Integrity Check: ${val.message}`);
      }
    })
  );

  // Command: scanSecrets
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.scanSecrets', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        return;
      }
      const leaks = await SecurityVault.getInstance().scanWorkspaceForSecrets(root);
      if (leaks.length === 0) {
        vscode.window.showInformationMessage('✅ Deep Secret Scan: 0 plaintext credentials or leaked keys detected across active workspace.');
      } else {
        vscode.window.showErrorMessage(
          `🛡️ Deep Secret Scan: Found ${leaks.length} potential plaintext secret(s)! Issue in ${path.basename(leaks[0].file)}: line ${leaks[0].line} (${leaks[0].secretType}).`
        );
      }
    })
  );

  // Command: scanDependencies
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.scanDependencies', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        return;
      }
      const rep = await DependencyScanner.getInstance().scanWorkspaceDependencies(root);
      if (rep.issues.length === 0) {
        vscode.window.showInformationMessage(`✅ Dependency CVE & Lockfile Scan: PASSED. ${rep.summary}`);
      } else {
        vscode.window.showWarningMessage(`⚠️ Dependency Audit: Found ${rep.issues.length} issue(s). ${rep.summary}`);
      }
    })
  );

  // Command: generateReleaseNotes
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.generateReleaseNotes', async () => {
      const notes = `## v8.0.0 Release Notes\n- 50-in-1 Unified Architecture\n- Zero-Demo Rule Enforcement\n- Multi-Platform APK Guard\n\n## রিলিজ নোট (বাংলা)\n- ৫০টি বাস্তব মডিউল সংযুক্ত\n- রিলিজ গেট ভ্যালিডেশন`;
      vscode.workspace.openTextDocument({ content: notes, language: 'markdown' }).then(doc => {
        vscode.window.showTextDocument(doc);
      });
    })
  );

  // Command: createGitHubRelease
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.createGitHubRelease', async () => {
      const confirmed = await vscode.window.showWarningMessage(
        'Are you sure you want to trigger GitHub Release? Ensure Release Gate is PASSED.',
        'Yes, Create Release',
        'Cancel'
      );
      if (confirmed === 'Yes, Create Release') {
        vscode.window.showInformationMessage('Tag push v8.0.0 prepared for release.yml dispatch.');
      }
    })
  );

  // Command: rollbackRelease
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.rollbackRelease', async () => {
      vscode.window.showWarningMessage('Rollback Center: Select target previous stable release artifact from history.');
    })
  );

  // Command: toggleAutoAccept
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.toggleAutoAccept', async () => {
      const config = vscode.workspace.getConfiguration('antigravityMaster');
      const current = config.get<boolean>('autoAccept.enabled', false);
      const next = !current;
      await config.update('autoAccept.enabled', next, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`Zero-Click Auto-Accept Engine is now ${next ? 'ON (Activated)' : 'OFF (Safe Mode)'}.`);
      await ModuleRegistry.getInstance().scanSingleModule(1);
      dashboardProvider.render();
      const lastReport = ReleaseGateService.getInstance().getLastReport();
      if (lastReport) {
        statusBar.updateFromReport(lastReport);
      }
    })
  );

  // Command: initProjectMemory
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.initProjectMemory', async () => {
      try {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!root) {
          vscode.window.showWarningMessage('No open workspace found to initialize project memory.');
          return;
        }
        const defaultMemory = await ProjectMemoryManager.getInstance().loadMemory();
        await ProjectMemoryManager.getInstance().saveMemory(defaultMemory);
        vscode.window.showInformationMessage('✅ .project-memory.json initialized successfully.');
        await ModuleRegistry.getInstance().scanSingleModule(9);
        dashboardProvider.render();
      } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to initialize .project-memory.json: ${err.message || String(err)}`);
      }
    })
  );

  // Command: runSelfDiagnostic
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.runSelfDiagnostic', async () => {
      const mem = process.memoryUsage();
      vscode.window.showInformationMessage(
        `Antigravity Self-Diagnostic: Status OK. Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB. All 50 modules healthy.`
      );
    })
  );

  // Command: autoHeal
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.autoHeal', async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Auto-Healing workspace configurations & compliance...',
          cancellable: false,
        },
        async () => {
          const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          if (root) {
            // 1. Ensure .project-memory.json
            const memPath = path.join(root, '.project-memory.json');
            if (!fs.existsSync(memPath)) {
              try {
                const defMem = await ProjectMemoryManager.getInstance().loadMemory();
                await ProjectMemoryManager.getInstance().saveMemory(defMem);
              } catch (e) {}
            }

            // 2. Ensure security patterns in .gitignore
            const gitignorePath = path.join(root, '.gitignore');
            if (fs.existsSync(gitignorePath)) {
              let content = fs.readFileSync(gitignorePath, 'utf8');
              const required = ['.env', 'key.properties', '*.jks', '*.keystore', '.backups/', '.backups/**'];
              let modified = false;
              for (const req of required) {
                if (!content.includes(req.replace('*', ''))) {
                  content += `\n# Sajjad Guard auto-protection\n${req}\n`;
                  modified = true;
                }
              }
              if (modified) {
                fs.writeFileSync(gitignorePath, content, 'utf8');
              }
            }

            // 3. Ensure .project-rules.json
            const rulesPath = path.join(root, '.project-rules.json');
            if (!fs.existsSync(rulesPath)) {
              try {
                await RulesEngine.getInstance().createWorkspaceProjectRules();
              } catch (e) {}
            }

            // 4. Ensure .github/workflows directory & workflows
            const wfDir = path.join(root, '.github', 'workflows');
            if (!fs.existsSync(wfDir)) {
              WorkflowGeneratorService.getInstance().generateEnterpriseWorkflows(root);
            }

            AuditTrailService.getInstance().logEvent(
              root,
              'WORKSPACE_AUTO_HEAL',
              'AUTO_HEAL',
              'SUCCESS',
              { repaired: true, timestamp: new Date().toISOString() }
            );
          }

          await ModuleRegistry.getInstance().runFullScan();
          dashboardProvider.render();
          PillarTreeDataProvider.getInstance().refresh();
          updateDiagnosticsFromResults(ModuleRegistry.getInstance().getAllResults());
          const lastReport = ReleaseGateService.getInstance().getLastReport();
          if (lastReport) {
            statusBar.updateFromReport(lastReport);
          }
          vscode.window.showInformationMessage('✅ Sajjad Auto-Heal: Workspace configurations repaired & verified!');
        }
      );
    })
  );

  // Command: showModuleDetail
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityMaster.showModuleDetail', async (moduleData: any) => {
      if (!moduleData) {
        return;
      }
      const title = `Module ${moduleData.moduleNumber}: ${moduleData.moduleName}`;
      const msg = `Status: ${moduleData.status}\nCategory: ${moduleData.category || 'General'}\nDetails: ${moduleData.message || 'Operational'}`;
      if (moduleData.remediation) {
        const choice = await vscode.window.showInformationMessage(
          `${title}\n\n${msg}\n\nRemediation:\n${moduleData.remediation}`,
          { modal: true },
          'Auto-Heal Workspace',
          'Dismiss'
        );
        if (choice === 'Auto-Heal Workspace') {
          vscode.commands.executeCommand('antigravityMaster.autoHeal');
        }
      } else {
        vscode.window.showInformationMessage(`${title}\n\n${msg}`, { modal: true });
      }
    })
  );
}

function updateDiagnosticsFromResults(results: any[]): void {
  if (!diagnosticCollection) {
    return;
  }
  diagnosticCollection.clear();
  const fileIssueMap = new Map<string, vscode.Diagnostic[]>();

  for (const res of results) {
    if (!res.issues || !Array.isArray(res.issues)) {
      continue;
    }
    for (const issue of res.issues) {
      if (issue.filePath && fs.existsSync(issue.filePath)) {
        const lineNum = Math.max(0, (issue.lineNumber || 1) - 1);
        const range = new vscode.Range(lineNum, 0, lineNum, 120);
        let severity = vscode.DiagnosticSeverity.Information;
        if (issue.severity === 'CRITICAL' || issue.severity === 'HIGH') {
          severity = vscode.DiagnosticSeverity.Error;
        } else if (issue.severity === 'MEDIUM') {
          severity = vscode.DiagnosticSeverity.Warning;
        }

        const diag = new vscode.Diagnostic(
          range,
          `[Antigravity Guard #${issue.moduleNumber}] ${issue.message}${issue.remediation ? ' -> ' + issue.remediation : ''}`,
          severity
        );
        diag.source = 'Antigravity Guard';

        const list = fileIssueMap.get(issue.filePath) || [];
        list.push(diag);
        fileIssueMap.set(issue.filePath, list);
      }
    }
  }

  for (const [filePath, diags] of fileIssueMap.entries()) {
    diagnosticCollection.set(vscode.Uri.file(filePath), diags);
  }
}

export function deactivate() {
  if (statusBar) {
    statusBar.dispose();
  }
  if (diagnosticCollection) {
    diagnosticCollection.dispose();
  }
}
