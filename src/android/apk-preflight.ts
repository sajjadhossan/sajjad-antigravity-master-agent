import * as fs from 'fs';
import * as path from 'path';
import { IModuleIssue } from '../types';

export interface IAndroidPreflightReport {
  hasManifest: boolean;
  manifestPath?: string;
  detectedPermissions: string[];
  missingPermissions: string[];
  gitignoreIssues: string[];
  signingStatus: 'VALID' | 'MISSING' | 'INSECURE';
  proguardConfigured: boolean;
  currentVersion: string;
  issues: IModuleIssue[];
}

export class AndroidPreflightService {
  private static instance: AndroidPreflightService;

  private constructor() {}

  public static getInstance(): AndroidPreflightService {
    if (!AndroidPreflightService.instance) {
      AndroidPreflightService.instance = new AndroidPreflightService();
    }
    return AndroidPreflightService.instance;
  }

  public async inspectWorkspace(workspaceRoot: string): Promise<IAndroidPreflightReport> {
    const issues: IModuleIssue[] = [];
    const possibleManifestPaths = [
      path.join(workspaceRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
      path.join(workspaceRoot, 'app', 'src', 'main', 'AndroidManifest.xml'),
      path.join(workspaceRoot, 'AndroidManifest.xml'),
    ];

    let manifestPath: string | undefined;
    for (const p of possibleManifestPaths) {
      if (fs.existsSync(p)) {
        manifestPath = p;
        break;
      }
    }

    const isAndroidOrFlutterWorkspace = !!manifestPath ||
      fs.existsSync(path.join(workspaceRoot, 'android')) ||
      fs.existsSync(path.join(workspaceRoot, 'pubspec.yaml'));

    const detectedPermissions: string[] = [];
    const missingPermissions: string[] = [];

    if (manifestPath && fs.existsSync(manifestPath)) {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const permRegex = /<uses-permission\s+android:name="android\.permission\.([A-Z_]+)"/g;
      let match;
      while ((match = permRegex.exec(manifestContent)) !== null) {
        detectedPermissions.push(match[1]);
      }

      // Check standard networking requirement if HTTP calls exist
      if (!detectedPermissions.includes('INTERNET')) {
        missingPermissions.push('INTERNET');
        issues.push({
          id: 'APK-PERM-NET',
          moduleNumber: 4,
          message: 'Missing <uses-permission android:name="android.permission.INTERNET" /> in AndroidManifest.xml',
          filePath: manifestPath,
          severity: 'HIGH',
          remediation: 'Add android.permission.INTERNET to AndroidManifest.xml before network API calls.',
        });
      }
    } else if (isAndroidOrFlutterWorkspace) {
      // Android project detected but manifest not found in standard locations
      issues.push({
        id: 'APK-NO-MANIFEST',
        moduleNumber: 4,
        message: 'AndroidManifest.xml not found in default locations. Configure custom android path if necessary.',
        severity: 'MEDIUM',
        remediation: 'Configure antigravityMaster.android.manifestPath in settings.',
      });
    }

    // Gitignore sensitive file checks
    const gitignoreIssues: string[] = [];
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      const sensitivePatterns = ['.env', 'key.properties', '*.jks', '*.keystore', 'google-services.json'];
      for (const req of sensitivePatterns) {
        const cleanReq = req.replace('*', '');
        const isCovered = gitignoreContent.includes(cleanReq);
        if (!isCovered) {
          // Check if sensitive file actually exists on disk in workspace unignored
          const fileExistsLocally = fs.existsSync(path.join(workspaceRoot, cleanReq)) ||
            (isAndroidOrFlutterWorkspace && fs.existsSync(path.join(workspaceRoot, 'android', cleanReq)));

          if (fileExistsLocally) {
            gitignoreIssues.push(req);
            issues.push({
              id: `APK-GITIGNORE-${req}`,
              moduleNumber: 4,
              message: `Active sensitive credential file '${req}' exists in project but is NOT covered by .gitignore!`,
              filePath: gitignorePath,
              severity: 'CRITICAL',
              remediation: `Append '${req}' to your root .gitignore immediately to prevent credential leaks.`,
            });
          } else if (isAndroidOrFlutterWorkspace && (req === 'key.properties' || req === '*.jks' || req === '*.keystore')) {
            gitignoreIssues.push(req);
            issues.push({
              id: `APK-GITIGNORE-REC-${req}`,
              moduleNumber: 4,
              message: `Android credential pattern '${req}' is recommended in .gitignore for release safety.`,
              filePath: gitignorePath,
              severity: 'LOW',
              remediation: `Add '${req}' to .gitignore before creating signing keys.`,
            });
          }
        }
      }
    }

    // Signing properties check
    let signingStatus: 'VALID' | 'MISSING' | 'INSECURE' = 'MISSING';
    const keyPropPath = path.join(workspaceRoot, 'android', 'key.properties');
    if (fs.existsSync(keyPropPath)) {
      const keyContent = fs.readFileSync(keyPropPath, 'utf8');
      if (keyContent.includes('keyAlias') && keyContent.includes('storeFile')) {
        signingStatus = 'VALID';
      } else {
        signingStatus = 'INSECURE';
        issues.push({
          id: 'APK-SIGNING-INCOMPLETE',
          moduleNumber: 4,
          message: 'android/key.properties exists but lacks required storeFile or keyAlias.',
          filePath: keyPropPath,
          severity: 'HIGH',
          remediation: 'Ensure keyAlias, keyPassword, storeFile, and storePassword are provided via environment or secure vault.',
        });
      }
    } else if (isAndroidOrFlutterWorkspace) {
      signingStatus = 'MISSING';
    }

    // Proguard check
    const proguardPath = path.join(workspaceRoot, 'android', 'app', 'proguard-rules.pro');
    const proguardConfigured = fs.existsSync(proguardPath);

    return {
      hasManifest: !!manifestPath,
      manifestPath,
      detectedPermissions,
      missingPermissions,
      gitignoreIssues,
      signingStatus,
      proguardConfigured,
      currentVersion: '8.0.0',
      issues,
    };
  }

  public async bumpVersion(workspaceRoot: string, newVersion: string): Promise<string[]> {
    const updatedFiles: string[] = [];

    // 1. package.json
    const pkgPath = path.join(workspaceRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkg.version = newVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
      updatedFiles.push(pkgPath);
    }

    // 2. pubspec.yaml
    const pubspecPath = path.join(workspaceRoot, 'pubspec.yaml');
    if (fs.existsSync(pubspecPath)) {
      let content = fs.readFileSync(pubspecPath, 'utf8');
      content = content.replace(/^version:\s*[\d\.\+\-]+/m, `version: ${newVersion}+1`);
      fs.writeFileSync(pubspecPath, content, 'utf8');
      updatedFiles.push(pubspecPath);
    }

    return updatedFiles;
  }
}
