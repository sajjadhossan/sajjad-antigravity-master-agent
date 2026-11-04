import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AuditTrailService } from '../audit/audit-trail.service';
import { WebhookDispatcherService } from '../alerts/webhook-dispatcher.service';

export async function runAuditAndAlertsTests(): Promise<void> {
  console.log('Running Audit Trail & Alerts Tests...');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-audit-test-'));

  try {
    // 1. Test AuditTrailService
    const auditService = AuditTrailService.getInstance();

    const entry1 = auditService.logEvent(
      tempDir,
      'APPLY_SECURITY_RULES',
      'SECURITY',
      'SUCCESS',
      { rulesCount: 15 },
      'tenant-dhaka-01'
    );

    assert.strictEqual(entry1.action, 'APPLY_SECURITY_RULES');
    assert.strictEqual(entry1.category, 'SECURITY');
    assert.strictEqual(entry1.status, 'SUCCESS');
    assert.strictEqual(entry1.tenant_id, 'tenant-dhaka-01');
    assert.strictEqual(typeof entry1.sha256, 'string');
    assert.strictEqual(entry1.sha256.length, 64, 'SHA-256 must be 64 characters hex');

    const entry2 = auditService.logEvent(
      tempDir,
      'RELEASE_GATE_EVALUATE',
      'RELEASE_GATE',
      'CRITICAL',
      { blockers: 2 },
      'tenant-dhaka-01'
    );

    const entries = auditService.getAuditEntries(tempDir);
    assert.strictEqual(entries.length, 2, 'Must have 2 audit entries');
    assert.strictEqual(entries[0].action, 'RELEASE_GATE_EVALUATE', 'Latest entry must be first');

    const mdReport = auditService.generateMarkdownReport(tempDir);
    assert.strictEqual(mdReport.includes('APPLY_SECURITY_RULES'), true, 'Report must contain action');
    assert.strictEqual(mdReport.includes('RELEASE_GATE_EVALUATE'), true, 'Report must contain release gate');
    assert.strictEqual(mdReport.includes('.antigravity/audit/audit-trail.jsonl'), true);

    // 2. Test WebhookDispatcherService
    const dispatcher = WebhookDispatcherService.getInstance();
    assert.strictEqual(!!dispatcher, true, 'WebhookDispatcher instance must exist');

    // Test invalid webhook URL rejection
    const invalidRes = await dispatcher.dispatchAlert('', {
      title: 'Test Alert',
      severity: 'CRITICAL',
      message: 'Critical error',
      timestamp: new Date().toISOString(),
    });
    assert.strictEqual(invalidRes.success, false, 'Should reject invalid URL');

    console.log('✔ Audit Trail & Alerts tests passed successfully.');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
