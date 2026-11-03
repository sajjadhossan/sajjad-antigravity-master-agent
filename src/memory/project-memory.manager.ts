import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { IProjectMemory } from '../types';

export class ProjectMemoryManager {
  private static instance: ProjectMemoryManager;

  private constructor() {}

  public static getInstance(): ProjectMemoryManager {
    if (!ProjectMemoryManager.instance) {
      ProjectMemoryManager.instance = new ProjectMemoryManager();
    }
    return ProjectMemoryManager.instance;
  }

  public getMemoryFilePath(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return undefined;
    }
    return path.join(folders[0].uri.fsPath, '.project-memory.json');
  }

  public async loadMemory(): Promise<IProjectMemory> {
    const filePath = this.getMemoryFilePath();
    if (filePath && fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse .project-memory.json:', e);
      }
    }

    return {
      projectType: 'Multi-Platform Commercial Application',
      techStack: ['TypeScript', 'Flutter/Dart', 'PostgreSQL', 'Node.js'],
      routes: ['/dashboard', '/auth/login', '/reports', '/settings'],
      models: ['User', 'Tenant', 'Invoice', 'LedgerEntry', 'AuditLog'],
      databaseTables: ['users', 'tenants', 'invoices', 'ledger_entries', 'audit_logs'],
      businessRules: [
        'Strict tenant isolation by tenant_id',
        'Soft delete for all ledger and member entries',
        'Default timezone Asia/Dhaka and BDT currency',
      ],
      knownIssues: [],
      completedFeatures: [
        'Activity Bar Dashboard',
        '50 Unified Scanning Modules',
        'Release Gate Protection',
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  public async saveMemory(memory: IProjectMemory): Promise<void> {
    const filePath = this.getMemoryFilePath();
    if (!filePath) {
      return;
    }
    memory.lastUpdated = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(memory, null, 2), 'utf8');
  }
}
