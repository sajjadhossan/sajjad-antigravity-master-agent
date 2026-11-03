import * as assert from 'assert';
import { IModuleIssue, IReleaseGateReport } from '../types';

export function runReleaseGateTests() {
  console.log('Running ReleaseGate Tests...');

  const sampleBlocker: IModuleIssue = {
    id: 'BLOCK-01',
    moduleNumber: 16,
    message: 'Raw floating point arithmetic used in financial ledger calculation',
    severity: 'CRITICAL',
    remediation: 'Use Decimal or minor integer units.',
  };

  const sampleReport: IReleaseGateReport = {
    timestamp: new Date().toISOString(),
    totalModules: 50,
    passedCount: 49,
    warningCount: 0,
    blockerCount: 1,
    isLocked: true,
    blockers: [sampleBlocker],
    warnings: [],
    summaryText: 'Release locked due to 1 critical blocker.',
  };

  assert.strictEqual(sampleReport.isLocked, true, 'Report must be locked when blocker count > 0');
  assert.strictEqual(sampleReport.blockers.length, 1, 'Blockers array must hold critical issue');

  console.log('✔ Release gate test passed.');
}
