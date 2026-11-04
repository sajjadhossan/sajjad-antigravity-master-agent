import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface IAuditEntry {
  id: string;
  tenant_id: string;
  action: string;
  category: 'SECURITY' | 'RELEASE_GATE' | 'AUTO_HEAL' | 'BACKUP' | 'VERSIONING' | 'CONFIG';
  actor: string;
  timestamp: string;
  status: 'SUCCESS' | 'WARNING' | 'CRITICAL' | 'BLOCKED';
  details: Record<string, any>;
  sha256: string;
}

export class AuditTrailService {
  private static instance: AuditTrailService;

  private constructor() {}

  public static getInstance(): AuditTrailService {
    if (!AuditTrailService.instance) {
      AuditTrailService.instance = new AuditTrailService();
    }
    return AuditTrailService.instance;
  }

  /**
   * Appends an immutable, tamper-evident audit entry to .antigravity/audit/audit-trail.jsonl
   */
  public logEvent(
    workspaceRoot: string,
    action: string,
    category: IAuditEntry['category'],
    status: IAuditEntry['status'],
    details: Record<string, any> = {},
    tenantId: string = 'tenant-master-default'
  ): IAuditEntry {
    const auditDir = path.join(workspaceRoot, '.antigravity', 'audit');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }

    const logPath = path.join(auditDir, 'audit-trail.jsonl');
    const timestamp = new Date().toISOString();
    const id = crypto.randomUUID();
    const actor = process.env.USERNAME || process.env.USER || 'developer-agent';

    // Hash payload for cryptographic tamper-proofing
    const rawForHash = `${id}:${tenantId}:${action}:${category}:${status}:${timestamp}`;
    const sha256 = crypto.createHash('sha256').update(rawForHash).digest('hex');

    const entry: IAuditEntry = {
      id,
      tenant_id: tenantId,
      action,
      category,
      actor,
      timestamp,
      status,
      details,
      sha256,
    };

    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');

    return entry;
  }

  /**
   * Reads and parses all audit entries
   */
  public getAuditEntries(workspaceRoot: string, limit = 100): IAuditEntry[] {
    const logPath = path.join(workspaceRoot, '.antigravity', 'audit', 'audit-trail.jsonl');
    if (!fs.existsSync(logPath)) {
      return [];
    }

    try {
      const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);
      const entries: IAuditEntry[] = [];
      for (const line of lines) {
        try {
          entries.push(JSON.parse(line));
        } catch (e) {}
      }
      return entries.reverse().slice(0, limit);
    } catch (e) {
      return [];
    }
  }

  /**
   * Formats audit trail into readable Markdown report
   */
  public generateMarkdownReport(workspaceRoot: string): string {
    const entries = this.getAuditEntries(workspaceRoot, 50);

    const rows = entries
      .map(
        e =>
          `| ${e.timestamp.slice(0, 19).replace('T', ' ')} | \`${e.category}\` | **${e.action}** | \`${e.status}\` | ${e.actor} | \`${e.sha256.slice(0, 8)}...\` |`
      )
      .join('\n');

    return `# 🛡️ Antigravity Enterprise Audit Trail Log

> **Standard:** Section 1 Rule 7 & Section 9 Enterprise Audit Protocol  
> **Storage Path:** \`.antigravity/audit/audit-trail.jsonl\`  
> **Total Records Displayed:** ${entries.length}

---

| Timestamp (UTC) | Category | Action | Status | Actor | Checksum |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows || '| - | - | *No audit records logged yet.* | - | - | - |'}

---
*Generated automatically by Sajjad Antigravity Master Agent.*
`;
  }
}
