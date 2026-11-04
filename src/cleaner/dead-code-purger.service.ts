import * as fs from 'fs';
import * as path from 'path';
import { BackupRecoveryService } from '../backup/backup-recovery.service';

export interface IDeadCodeIssue {
  type: 'CONSOLE_LOG' | 'ORPHAN_ASSET' | 'EMPTY_DIRECTORY' | 'DEBUG_COMMENT';
  filePath: string;
  lineNumber?: number;
  snippet?: string;
  description: string;
}

export interface ICleanAuditReport {
  totalIssues: number;
  consoleLogs: number;
  orphanAssets: number;
  emptyDirectories: number;
  issues: IDeadCodeIssue[];
}

export class DeadCodePurgerService {
  private static instance: DeadCodePurgerService;

  private constructor() {}

  public static getInstance(): DeadCodePurgerService {
    if (!DeadCodePurgerService.instance) {
      DeadCodePurgerService.instance = new DeadCodePurgerService();
    }
    return DeadCodePurgerService.instance;
  }

  /**
   * Performs an audit across workspace code and assets to identify dead code and orphaned files
   */
  public async auditWorkspace(workspaceRoot: string): Promise<ICleanAuditReport> {
    const issues: IDeadCodeIssue[] = [];

    // 1. Scan for console.log / print in source files
    const sourceFiles = this.findSourceFiles(workspaceRoot);
    const assetFiles = this.findAssetFiles(workspaceRoot);

    // Read all source file contents into memory to check asset references
    const sourceContents: string[] = [];
    for (const file of sourceFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        sourceContents.push(content);

        const lines = content.split('\n');
        const relPath = path.relative(workspaceRoot, file).toLowerCase().replace(/\\/g, '/');
        const isTestFile = relPath.startsWith('test/') || relPath.startsWith('tests/') || relPath.includes('/test/') || relPath.includes('__tests__') || relPath.includes('.test.') || relPath.includes('.spec.');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          // Detect console.log or print that are not inside tests
          if (!isTestFile) {
            if (/^\s*console\.(log|debug|info)\s*\(/.test(line)) {
              issues.push({
                type: 'CONSOLE_LOG',
                filePath: file,
                lineNumber: i + 1,
                snippet: line.substring(0, 80),
                description: 'Lingering console logging statement in production code',
              });
            } else if (/^\s*print\s*\(/.test(line) && file.endsWith('.dart')) {
              issues.push({
                type: 'CONSOLE_LOG',
                filePath: file,
                lineNumber: i + 1,
                snippet: line.substring(0, 80),
                description: 'Lingering raw print statement in production Dart code',
              });
            }
          }
        }
      } catch (e) {}
    }

    // 2. Scan for Orphaned Assets
    const joinedSource = sourceContents.join('\n');
    for (const asset of assetFiles) {
      const baseName = path.basename(asset);
      // Check if file name or relative path is mentioned in source code
      if (!joinedSource.includes(baseName)) {
        issues.push({
          type: 'ORPHAN_ASSET',
          filePath: asset,
          description: `Unreferenced asset file '${baseName}' not imported or mentioned in codebase`,
        });
      }
    }

    // 3. Scan for Empty Directories
    this.findEmptyDirectories(workspaceRoot, issues);

    return {
      totalIssues: issues.length,
      consoleLogs: issues.filter(i => i.type === 'CONSOLE_LOG').length,
      orphanAssets: issues.filter(i => i.type === 'ORPHAN_ASSET').length,
      emptyDirectories: issues.filter(i => i.type === 'EMPTY_DIRECTORY').length,
      issues,
    };
  }

  /**
   * Safely purges identified console logs and removes empty directories with pre-execution backup
   */
  public async purgeIssues(workspaceRoot: string, options: { removeConsoleLogs?: boolean; removeEmptyDirs?: boolean } = { removeConsoleLogs: true, removeEmptyDirs: true }): Promise<{ cleanedCount: number; backupCreated: boolean }> {
    // 1. Create safety backup first
    let backupCreated = false;
    try {
      await BackupRecoveryService.getInstance().createBackup(workspaceRoot);
      backupCreated = true;
    } catch (e) {}

    const audit = await this.auditWorkspace(workspaceRoot);
    let cleanedCount = 0;

    if (options.removeConsoleLogs) {
      // Group by file
      const consoleIssues = audit.issues.filter(i => i.type === 'CONSOLE_LOG');
      const filesMap = new Map<string, number[]>();

      for (const iss of consoleIssues) {
        if (iss.lineNumber) {
          const list = filesMap.get(iss.filePath) || [];
          list.push(iss.lineNumber);
          filesMap.set(iss.filePath, list);
        }
      }

      for (const [filePath, lineNumbers] of filesMap.entries()) {
        try {
          const lines = fs.readFileSync(filePath, 'utf8').split('\n');
          const linesSet = new Set(lineNumbers.map(n => n - 1));
          const filtered = lines.filter((_, idx) => !linesSet.has(idx));
          fs.writeFileSync(filePath, filtered.join('\n'), 'utf8');
          cleanedCount += lineNumbers.length;
        } catch (e) {}
      }
    }

    if (options.removeEmptyDirs) {
      const emptyDirIssues = audit.issues.filter(i => i.type === 'EMPTY_DIRECTORY');
      for (const dirIssue of emptyDirIssues) {
        try {
          if (fs.existsSync(dirIssue.filePath) && fs.readdirSync(dirIssue.filePath).length === 0) {
            fs.rmdirSync(dirIssue.filePath);
            cleanedCount++;
          }
        } catch (e) {}
      }
    }

    return {
      cleanedCount,
      backupCreated,
    };
  }

  private findSourceFiles(dir: string, maxFiles = 200): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) {
      return results;
    }

    const walk = (current: string) => {
      if (results.length >= maxFiles) return;
      try {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build' || entry.name === 'out') {
            continue;
          }
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (/\.(ts|js|tsx|jsx|dart)$/.test(entry.name)) {
            results.push(full);
          }
        }
      } catch (e) {}
    };

    walk(dir);
    return results;
  }

  private findAssetFiles(dir: string, maxFiles = 50): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) {
      return results;
    }

    const walk = (current: string) => {
      if (results.length >= maxFiles) return;
      try {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
            continue;
          }
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (/\.(png|jpg|jpeg|gif|ico|webp)$/.test(entry.name)) {
            // Avoid standard extension icons
            if (!full.includes('media') && !full.includes('icons')) {
              results.push(full);
            }
          }
        }
      } catch (e) {}
    };

    walk(dir);
    return results;
  }

  private findEmptyDirectories(dir: string, issues: IDeadCodeIssue[]): void {
    if (!fs.existsSync(dir)) {
      return;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
          continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const subEntries = fs.readdirSync(full);
          if (subEntries.length === 0) {
            issues.push({
              type: 'EMPTY_DIRECTORY',
              filePath: full,
              description: `Empty directory '${path.basename(full)}' can be safely pruned`,
            });
          } else {
            this.findEmptyDirectories(full, issues);
          }
        }
      }
    } catch (e) {}
  }
}
