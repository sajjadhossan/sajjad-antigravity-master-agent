import * as assert from 'assert';
import * as path from 'path';
import { ParityGuardService } from '../core/parity-guard.service';
import { Module32DtoContractValidator } from '../modules';

export async function runParityGuardTests() {
  console.log('Running Cross-Platform Parity Guard Tests...');
  const workspaceRoot = path.resolve(__dirname, '..', '..');

  // 1. Service execution test
  const paritySvc = ParityGuardService.getInstance();
  const report = await paritySvc.auditWorkspaceParity(workspaceRoot);

  assert.ok(report, 'Parity audit report must be generated');
  assert.ok(Array.isArray(report.models), 'Discovered models must be an array');
  assert.ok(Array.isArray(report.issues), 'Audit issues must be an array');
  assert.ok(report.metrics, 'Metrics object must be returned');
  assert.ok(typeof report.metrics.tenantIsolatedPercentage === 'string', 'Tenant isolated percentage must be string');
  assert.ok(typeof report.metrics.softDeletePercentage === 'string', 'Soft delete percentage must be string');

  // 2. Module 32 Execution Test
  const mod32 = new Module32DtoContractValidator();
  const mod32Result = await mod32.executeScan(workspaceRoot);
  assert.strictEqual(mod32Result.moduleNumber, 32, 'Must scan module 32');
  assert.ok(mod32Result.status, 'Must have a defined ModuleStatus');
  assert.ok(mod32Result.metrics, 'Must provide parity metrics');

  console.log('✔ Cross-Platform Parity Guard tests passed successfully.');
}
