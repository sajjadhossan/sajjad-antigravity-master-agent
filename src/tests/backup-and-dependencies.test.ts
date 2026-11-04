import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { BackupRecoveryService } from '../backup/backup-recovery.service';
import { DependencyScanner } from '../core/dependency-scanner';
import { SecurityVault } from '../core/security-vault';

export async function runBackupAndDependencyTests() {
  console.log('Running Backup & Dependency Scanner Tests...');
  const workspaceRoot = path.resolve(__dirname, '..', '..');

  // 1. Test Backup Creation
  const backupSvc = BackupRecoveryService.getInstance();
  const backupRes = await backupSvc.createBackup(workspaceRoot);
  assert.ok(fs.existsSync(backupRes.archivePath), 'Backup archive file must exist');
  assert.ok(fs.existsSync(backupRes.checksumPath), 'Backup checksum file must exist');
  assert.ok(backupRes.manifest.totalFiles > 0, 'Backup manifest must count files');
  assert.ok(backupRes.manifest.compressedBytes > 0, 'Compressed bytes must be positive');

  // 2. Test Backup Restore Validation
  const valRes = await backupSvc.validateLatestBackup(workspaceRoot);
  assert.strictEqual(valRes.valid, true, 'Latest backup must be valid and verified');
  assert.strictEqual(valRes.checksumMatch, true, 'SHA256 checksum must match');
  assert.strictEqual(valRes.corruptedFiles.length, 0, 'Zero corrupted files expected');

  // 3. Test Dependency Scanner
  const depScanner = DependencyScanner.getInstance();
  const depReport = await depScanner.scanWorkspaceDependencies(workspaceRoot);
  assert.ok(depReport.manifestsScanned.includes('package.json'), 'package.json must be scanned');
  assert.strictEqual(depReport.hasLockfile, true, 'package-lock.json must be detected');
  assert.ok(depReport.totalDependencies > 0, 'Dependencies count must be greater than 0');

  // 4. Test Secret Scanning
  const vault = SecurityVault.getInstance();
  const leaks = await vault.scanWorkspaceForSecrets(workspaceRoot);
  assert.ok(Array.isArray(leaks), 'Secret scanner must return array of findings');

  console.log('✔ Backup and Dependency tests passed successfully.');
}
