import * as fs from 'fs';
import * as path from 'path';
import { IModuleIssue } from '../types';

export interface IDependencyAuditReport {
  manifestsScanned: string[];
  totalDependencies: number;
  hasLockfile: boolean;
  issues: IModuleIssue[];
  summary: string;
}

export class DependencyScanner {
  private static instance: DependencyScanner;

  private constructor() {}

  public static getInstance(): DependencyScanner {
    if (!DependencyScanner.instance) {
      DependencyScanner.instance = new DependencyScanner();
    }
    return DependencyScanner.instance;
  }

  public async scanWorkspaceDependencies(workspaceRoot: string): Promise<IDependencyAuditReport> {
    const issues: IModuleIssue[] = [];
    const manifestsScanned: string[] = [];
    let totalDependencies = 0;
    let hasLockfile = false;

    // 1. Audit package.json & package-lock.json (Node / TypeScript)
    const pkgPath = path.join(workspaceRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      manifestsScanned.push('package.json');
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const allDeps: Record<string, string> = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
        };
        const depNames = Object.keys(allDeps);
        totalDependencies += depNames.length;

        // Check lockfile presence
        const lockPath = path.join(workspaceRoot, 'package-lock.json');
        const yarnLock = path.join(workspaceRoot, 'yarn.lock');
        const pnpmLock = path.join(workspaceRoot, 'pnpm-lock.yaml');
        hasLockfile = fs.existsSync(lockPath) || fs.existsSync(yarnLock) || fs.existsSync(pnpmLock);

        if (!hasLockfile && depNames.length > 0) {
          issues.push({
            id: 'DEP-LOCKFILE-MISSING',
            moduleNumber: 17,
            message: 'No lockfile (package-lock.json, yarn.lock, or pnpm-lock.yaml) found for npm dependencies.',
            filePath: pkgPath,
            severity: 'HIGH',
            remediation: 'Run npm install to generate package-lock.json for reproducible, tamper-proof builds.',
          });
        }

        // Check for risky wildcard or unpinned versions
        for (const [dep, ver] of Object.entries(allDeps)) {
          if (ver === '*' || ver === 'latest' || ver.startsWith('>')) {
            issues.push({
              id: `DEP-UNPINNED-${dep}`,
              moduleNumber: 17,
              message: `Package '${dep}' uses unsafe wildcard version constraint '${ver}'.`,
              filePath: pkgPath,
              severity: 'HIGH',
              remediation: `Pin '${dep}' to a specific semantic version (e.g., ^1.2.3 or 1.2.3) to prevent unexpected upstream breaking changes.`,
            });
          } else if (ver.startsWith('http://') || ver.startsWith('git://')) {
            issues.push({
              id: `DEP-INSECURE-PROTOCOL-${dep}`,
              moduleNumber: 17,
              message: `Package '${dep}' is downloaded over insecure unencrypted protocol: '${ver}'.`,
              filePath: pkgPath,
              severity: 'CRITICAL',
              remediation: `Use HTTPS or SSH (git+https:// or git+ssh://) to prevent man-in-the-middle attacks.`,
            });
          }
        }
      } catch (err: any) {
        issues.push({
          id: 'DEP-PKG-PARSE-ERR',
          moduleNumber: 17,
          message: `Failed to parse package.json: ${err.message || String(err)}`,
          filePath: pkgPath,
          severity: 'HIGH',
          remediation: 'Ensure package.json is valid JSON.',
        });
      }
    }

    // 2. Audit pubspec.yaml (Flutter / Dart)
    const pubspecPath = path.join(workspaceRoot, 'pubspec.yaml');
    if (fs.existsSync(pubspecPath)) {
      manifestsScanned.push('pubspec.yaml');
      try {
        const content = fs.readFileSync(pubspecPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.includes(': any')) {
            issues.push({
              id: `PUB-UNPINNED-ANY-${idx + 1}`,
              moduleNumber: 17,
              message: `Pub dependency uses unrestricted 'any' version: "${trimmed}"`,
              filePath: pubspecPath,
              lineNumber: idx + 1,
              severity: 'HIGH',
              remediation: 'Specify semantic version range using ^x.y.z constraint.',
            });
          }
        });
      } catch (e) {}
    }

    const summary = manifestsScanned.length > 0
      ? `Scanned ${manifestsScanned.join(', ')}: Found ${totalDependencies} dependencies. Lockfile present: ${hasLockfile}. Issues detected: ${issues.length}.`
      : 'No standard package manifests found (package.json or pubspec.yaml).';

    return {
      manifestsScanned,
      totalDependencies,
      hasLockfile,
      issues,
      summary,
    };
  }
}
