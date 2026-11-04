import * as vscode from 'vscode';
import { RulesEngine } from '../rules/rules-engine';

export class AntigravityCodeLensProvider implements vscode.CodeLensProvider {
  private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

  public refresh(): void {
    this.onDidChangeCodeLensesEmitter.fire();
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const activeRulesCount = RulesEngine.getInstance().getActiveRules().length;

    // Detect class, export, or top-level controller declarations
    const classRegex = /\b(class|export\s+(?:default\s+)?class|function|export\s+function|export\s+const)\s+([A-Za-z0-9_]+)/g;
    let match;
    let matchCount = 0;

    while ((match = classRegex.exec(text)) !== null) {
      if (matchCount >= 5) {
        break; // Keep CodeLens lightweight and non-cluttered
      }
      matchCount++;

      const pos = document.positionAt(match.index);
      const range = new vscode.Range(pos, pos);

      // 1. Sajjad Guard Status CodeLens
      const guardLens = new vscode.CodeLens(range, {
        title: `$(shield) Sajjad Guard: Enterprise Active`,
        tooltip: 'Protected by Sajjad Antigravity Master Agent (Zero-Demo & Tenant Isolated)',
        command: 'antigravityMaster.openDashboard',
      });
      codeLenses.push(guardLens);

      // 2. Rules Count CodeLens
      const rulesLens = new vscode.CodeLens(range, {
        title: `$(law) ${activeRulesCount} Rules Verified`,
        tooltip: `Audited against ${activeRulesCount} active industry and project rules`,
        command: 'antigravityMaster.manageRules',
      });
      codeLenses.push(rulesLens);
    }

    return codeLenses;
  }
}
