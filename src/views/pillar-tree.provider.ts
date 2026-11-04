import * as vscode from 'vscode';
import { ModuleRegistry } from '../core/module-registry';
import { IModuleScanResult, ModuleStatus } from '../types';

export enum PillarTreeItemType {
  HEALTH_HEADER,
  QUICK_ACTIONS_HEADER,
  QUICK_ACTION,
  PILLAR,
  MODULE,
}

export class PillarTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: PillarTreeItemType,
    public readonly pillarName?: string,
    public readonly moduleData?: IModuleScanResult,
    public readonly commandId?: string,
    public readonly pillarCategories?: string[]
  ) {
    super(label, collapsibleState);

    if (itemType === PillarTreeItemType.HEALTH_HEADER) {
      this.iconPath = new vscode.ThemeIcon('shield', new vscode.ThemeColor('testing.iconPassed'));
      this.contextValue = 'healthHeader';
    } else if (itemType === PillarTreeItemType.QUICK_ACTIONS_HEADER) {
      this.iconPath = new vscode.ThemeIcon('zap', new vscode.ThemeColor('charts.yellow'));
      this.contextValue = 'quickActionsHeader';
    } else if (itemType === PillarTreeItemType.QUICK_ACTION) {
      this.iconPath = new vscode.ThemeIcon('play-circle');
      this.contextValue = 'quickAction';
      if (commandId) {
        this.command = {
          command: commandId,
          title: label,
        };
      }
    } else if (itemType === PillarTreeItemType.PILLAR) {
      this.iconPath = new vscode.ThemeIcon('folder-active');
      this.contextValue = 'pillar';
    } else if (itemType === PillarTreeItemType.MODULE && moduleData) {
      this.id = `module-${moduleData.moduleNumber}`;
      this.description = moduleData.status;
      const primaryIssue = moduleData.issues?.[0];
      const detailMsg = primaryIssue?.message || moduleData.degradationNote || (moduleData.issues.length > 0 ? `${moduleData.issues.length} issues detected` : 'Operational');
      const remediationMsg = primaryIssue?.remediation;

      this.tooltip = new vscode.MarkdownString(
        `### Module ${moduleData.moduleNumber}: ${moduleData.moduleName}\n\n` +
        `* **Status:** \`${moduleData.status}\`\n` +
        `* **Category:** ${moduleData.category || 'General'}\n` +
        `* **Details:** ${detailMsg}\n` +
        (remediationMsg ? `\n> **Remediation:** ${remediationMsg}` : '')
      );

      switch (moduleData.status) {
        case ModuleStatus.WORKING:
          this.iconPath = new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('testing.iconPassed'));
          break;
        case ModuleStatus.ERROR:
          this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
          break;
        case ModuleStatus.WAITING:
        default:
          this.iconPath = new vscode.ThemeIcon('clock', new vscode.ThemeColor('testing.iconQueued'));
          break;
      }

      this.command = {
        command: 'antigravityMaster.showModuleDetail',
        title: 'Show Module Details',
        arguments: [moduleData],
      };
    }
  }
}

export class PillarTreeDataProvider implements vscode.TreeDataProvider<PillarTreeItem> {
  private static instance: PillarTreeDataProvider;
  private _onDidChangeTreeData: vscode.EventEmitter<PillarTreeItem | undefined | null | void> =
    new vscode.EventEmitter<PillarTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<PillarTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private constructor() {}

  public static getInstance(): PillarTreeDataProvider {
    if (!PillarTreeDataProvider.instance) {
      PillarTreeDataProvider.instance = new PillarTreeDataProvider();
    }
    return PillarTreeDataProvider.instance;
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: PillarTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: PillarTreeItem): Promise<PillarTreeItem[]> {
    const registry = ModuleRegistry.getInstance();
    const results = registry.getAllResults();

    // Root elements
    if (!element) {
      const passingCount = results.filter(r => r.status === ModuleStatus.WORKING).length;
      const totalCount = results.length || 50;
      const score = Math.round((passingCount / totalCount) * 100);

      const items: PillarTreeItem[] = [];

      // 1. Health Score Header
      items.push(
        new PillarTreeItem(
          `System Health: ${score}% (${score >= 80 ? 'Compliant' : 'Attention Needed'})`,
          vscode.TreeItemCollapsibleState.None,
          PillarTreeItemType.HEALTH_HEADER
        )
      );

      // 2. Quick Actions Section
      items.push(
        new PillarTreeItem(
          'Quick Actions',
          vscode.TreeItemCollapsibleState.Collapsed,
          PillarTreeItemType.QUICK_ACTIONS_HEADER
        )
      );

      // 3. Five Pillars
      const pillars = [
        { name: 'Security & Compliance', label: '🔒 Pillar 1: Security & Compliance', categories: ['security', 'finance', 'secrets', 'owasp'] },
        { name: 'DevOps & Delivery', label: '🚀 Pillar 2: DevOps & Delivery', categories: ['devops', 'android', 'git', 'versioning'] },
        { name: 'Code Quality & Testing', label: '🧪 Pillar 3: Code Quality & Testing', categories: ['codequality', 'testing', 'performance', 'i18n'] },
        { name: 'Data Safety & Sync', label: '💾 Pillar 4: Data Safety & Sync', categories: ['datasafety', 'database', 'automation'] },
        { name: 'Architecture & Governance', label: '🏛️ Pillar 5: Architecture & Governance', categories: ['architecture', 'ui/ux', 'brand', 'hardware', 'releasegate', 'ai'] },
      ];

      for (const p of pillars) {
        items.push(
          new PillarTreeItem(
            p.label,
            vscode.TreeItemCollapsibleState.Collapsed,
            PillarTreeItemType.PILLAR,
            p.name,
            undefined,
            undefined,
            p.categories
          )
        );
      }

      return items;
    }

    // Quick Actions children
    if (element.itemType === PillarTreeItemType.QUICK_ACTIONS_HEADER) {
      return [
        new PillarTreeItem('Run Verification Across 1–50', vscode.TreeItemCollapsibleState.None, PillarTreeItemType.QUICK_ACTION, undefined, undefined, 'antigravityMaster.runAllChecks'),
        new PillarTreeItem('✨ 1-Click Auto-Heal Workspace', vscode.TreeItemCollapsibleState.None, PillarTreeItemType.QUICK_ACTION, undefined, undefined, 'antigravityMaster.autoHeal'),
        new PillarTreeItem('Open Command Center Dashboard', vscode.TreeItemCollapsibleState.None, PillarTreeItemType.QUICK_ACTION, undefined, undefined, 'antigravityMaster.openDashboard'),
        new PillarTreeItem('Generate GitHub Actions CI/CD Workflows', vscode.TreeItemCollapsibleState.None, PillarTreeItemType.QUICK_ACTION, undefined, undefined, 'antigravityMaster.generateWorkflows'),
        new PillarTreeItem('Audit Workspace for Hardcoded Secrets', vscode.TreeItemCollapsibleState.None, PillarTreeItemType.QUICK_ACTION, undefined, undefined, 'antigravityMaster.scanSecrets'),
        new PillarTreeItem('Scan Dependencies & Lockfile Health', vscode.TreeItemCollapsibleState.None, PillarTreeItemType.QUICK_ACTION, undefined, undefined, 'antigravityMaster.scanDependencies'),
        new PillarTreeItem('Verify Cross-Platform DTO & Schema Parity', vscode.TreeItemCollapsibleState.None, PillarTreeItemType.QUICK_ACTION, undefined, undefined, 'antigravityMaster.validateDtoParity'),
      ];
    }

    // Pillar children (Modules belonging to this pillar)
    if (element.itemType === PillarTreeItemType.PILLAR && element.pillarCategories) {
      const pillarModules = results.filter(m => {
        const cat = (m.category || '').toLowerCase();
        return element.pillarCategories!.some(c => cat.includes(c) || m.moduleName.toLowerCase().includes(c));
      });
      return pillarModules.map(
        mod => new PillarTreeItem(
          `Mod ${mod.moduleNumber}: ${mod.moduleName}`,
          vscode.TreeItemCollapsibleState.None,
          PillarTreeItemType.MODULE,
          element.pillarName,
          mod
        )
      );
    }

    return [];
  }
}
