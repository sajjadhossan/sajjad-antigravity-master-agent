import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { IRuleItem, IModuleIssue } from '../types';

export class RulesEngine {
  private static instance: RulesEngine;
  private extensionUri?: vscode.Uri;
  private activeRules: IRuleItem[] = [];

  private constructor() {}

  public static getInstance(): RulesEngine {
    if (!RulesEngine.instance) {
      RulesEngine.instance = new RulesEngine();
    }
    return RulesEngine.instance;
  }

  public init(context: vscode.ExtensionContext): void {
    this.extensionUri = context.extensionUri;
    this.reloadRules();
  }

  public reloadRules(): void {
    this.activeRules = [];
    // 1. Load global rules
    if (this.extensionUri) {
      const globalPath = path.join(this.extensionUri.fsPath, 'resources', 'rules', 'global-rules.json');
      if (fs.existsSync(globalPath)) {
        try {
          const raw = fs.readFileSync(globalPath, 'utf8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.rules)) {
            this.activeRules.push(...parsed.rules);
          }
        } catch (err) {
          console.error('Failed to load global rules:', err);
        }
      }
    }

    // 2. Load workspace .project-rules.json if present
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const projectPath = path.join(workspaceFolders[0].uri.fsPath, '.project-rules.json');
      if (fs.existsSync(projectPath)) {
        try {
          const raw = fs.readFileSync(projectPath, 'utf8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.rules)) {
            this.activeRules.push(...parsed.rules);
          }
        } catch (err) {
          console.error('Failed to load project rules:', err);
        }
      }
    }
  }

  public getActiveRules(): IRuleItem[] {
    return [...this.activeRules];
  }

  public async scanContent(content: string, filePath: string): Promise<IModuleIssue[]> {
    const issues: IModuleIssue[] = [];
    const lines = content.split('\n');

    for (const rule of this.activeRules) {
      if (rule.enabled === false) {
        continue;
      }
      try {
        const regex = new RegExp(rule.pattern, 'g');
        lines.forEach((line, index) => {
          if (regex.test(line)) {
            issues.push({
              id: `${rule.id}-${index + 1}`,
              moduleNumber: 15,
              message: `[${rule.name}] ${rule.description}`,
              filePath,
              lineNumber: index + 1,
              severity: rule.severity,
              remediation: rule.recommendation,
            });
          }
        });
      } catch (err) {
        // Skip invalid regex pattern safely
      }
    }

    return issues;
  }

  public async createWorkspaceProjectRules(): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No open workspace found.');
    }
    const targetPath = path.join(workspaceFolders[0].uri.fsPath, '.project-rules.json');
    if (fs.existsSync(targetPath)) {
      return targetPath;
    }

    const initialTemplate = {
      version: '1.0.0',
      name: 'Custom Project Rules',
      rules: [
        {
          id: 'RULE-PROJ-01',
          name: 'Mandatory Audit Trail',
          category: 'Architecture',
          severity: 'HIGH',
          description: 'Ensure audit logger is invoked on all mutation controllers.',
          pattern: "createRecord\\(|deleteRecord\\(",
          recommendation: 'Call auditLogService.record(...) on all state mutations.',
          enabled: true
        }
      ]
    };

    fs.writeFileSync(targetPath, JSON.stringify(initialTemplate, null, 2), 'utf8');
    this.reloadRules();
    return targetPath;
  }

  public async applyTemplate(templateId: string): Promise<boolean> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0 || !this.extensionUri) {
      return false;
    }
    const templateFile = path.join(this.extensionUri.fsPath, 'resources', 'rules', 'project-templates', `${templateId}.json`);
    if (!fs.existsSync(templateFile)) {
      return false;
    }

    const content = fs.readFileSync(templateFile, 'utf8');
    const parsed = JSON.parse(content);
    const targetPath = path.join(workspaceFolders[0].uri.fsPath, '.project-rules.json');

    let currentRules: IRuleItem[] = [];
    if (fs.existsSync(targetPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
        currentRules = existing.rules || [];
      } catch (e) {
        currentRules = [];
      }
    }

    const combined = [...currentRules, ...(parsed.rules || [])];
    fs.writeFileSync(targetPath, JSON.stringify({ version: '1.0.0', name: parsed.name, rules: combined }, null, 2), 'utf8');
    this.reloadRules();
    return true;
  }
}
