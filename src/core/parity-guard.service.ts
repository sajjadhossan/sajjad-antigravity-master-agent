import * as fs from 'fs';
import * as path from 'path';
import { IModuleIssue } from '../types';

export interface IDiscoveredModel {
  name: string;
  filePath: string;
  fields: string[];
  hasTenantId: boolean;
  hasSoftDelete: boolean;
  hasAuditFields: boolean;
  hasRawFloat: boolean;
}

export interface IParityAuditReport {
  modelsAudited: number;
  models: IDiscoveredModel[];
  issues: IModuleIssue[];
  metrics: {
    totalEntities: number;
    tenantIsolatedPercentage: string;
    softDeletePercentage: string;
    parityViolations: number;
  };
}

export class ParityGuardService {
  private static instance: ParityGuardService;

  private constructor() {}

  public static getInstance(): ParityGuardService {
    if (!ParityGuardService.instance) {
      ParityGuardService.instance = new ParityGuardService();
    }
    return ParityGuardService.instance;
  }

  /**
   * Scans workspace models, Prisma schemas, SQL migrations, and Dart/TS DTOs for contract parity.
   */
  public async auditWorkspaceParity(workspaceRoot: string): Promise<IParityAuditReport> {
    const issues: IModuleIssue[] = [];
    const models: IDiscoveredModel[] = [];

    // Ignored directories for speed
    const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'out', 'build', '.vscode-test', '.backups']);

    function walkDir(dir: string, depth = 0) {
      if (depth > 6) {
        return;
      }
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (ignoredDirs.has(entry.name)) {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            const fileName = entry.name.toLowerCase();

            // 1. Prisma Schema
            if (fileName.endsWith('.prisma')) {
              ParityGuardService.instance.parsePrismaSchema(fullPath, models, issues);
            }
            // 2. TypeScript / DTO interfaces & types
            else if ((ext === '.ts' || ext === '.js') && (fileName.includes('schema') || fileName.includes('model') || fileName.includes('type') || fileName.includes('entity'))) {
              ParityGuardService.instance.parseTypeScriptModels(fullPath, models, issues);
            }
            // 3. Dart Models (Flutter)
            else if (ext === '.dart' && (fileName.includes('model') || fileName.includes('entity') || fileName.includes('dto'))) {
              ParityGuardService.instance.parseDartModels(fullPath, models, issues);
            }
            // 4. SQL DDL Migrations
            else if (ext === '.sql' && (fileName.includes('migration') || fileName.includes('schema') || fileName.includes('init'))) {
              ParityGuardService.instance.parseSqlDdl(fullPath, models, issues);
            }
          }
        }
      } catch (e) {}
    }

    walkDir(workspaceRoot);

    // Cross-platform DTO parity checks: compare matching models
    this.crossCheckModelParity(models, issues);

    const totalEntities = models.length;
    const tenantOkCount = models.filter(m => m.hasTenantId).length;
    const softDeleteCount = models.filter(m => m.hasSoftDelete).length;

    const tenantPct = totalEntities > 0 ? `${Math.round((tenantOkCount / totalEntities) * 100)}%` : '100%';
    const softDeletePct = totalEntities > 0 ? `${Math.round((softDeleteCount / totalEntities) * 100)}%` : '100%';

    return {
      modelsAudited: totalEntities,
      models,
      issues,
      metrics: {
        totalEntities,
        tenantIsolatedPercentage: tenantPct,
        softDeletePercentage: softDeletePct,
        parityViolations: issues.length,
      },
    };
  }

  private parsePrismaSchema(filePath: string, models: IDiscoveredModel[], issues: IModuleIssue[]): void {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const modelBlocks = content.split(/model\s+([A-Za-z0-9_]+)\s*\{/g);

      for (let i = 1; i < modelBlocks.length; i += 2) {
        const modelName = modelBlocks[i];
        const body = modelBlocks[i + 1] ? modelBlocks[i + 1].split('}')[0] : '';
        const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('@@'));
        const fields = lines.map(l => l.split(/\s+/)[0]);

        const hasTenantId = fields.some(f => /^(tenant_id|business_id|organization_id)$/i.test(f));
        const hasSoftDelete = fields.some(f => /^(deleted_at|deletedat|is_deleted|isdeleted)$/i.test(f));
        const hasAuditFields = fields.some(f => /^(created_at|createdat)$/i.test(f)) && fields.some(f => /^(updated_at|updatedat)$/i.test(f));
        const hasRawFloat = body.includes('Float') && /(amount|price|balance|total|fee)/i.test(body);

        models.push({
          name: modelName,
          filePath,
          fields,
          hasTenantId,
          hasSoftDelete,
          hasAuditFields,
          hasRawFloat,
        });

        // Enforce Multi-Tenant Isolation
        if (!hasTenantId && !['Tenant', 'Business', 'PlatformAdmin', 'SuperAdmin', 'Subscription'].includes(modelName)) {
          issues.push({
            id: `PARITY-TENANT-PRISMA-${modelName}`,
            moduleNumber: 32,
            message: `Prisma model '${modelName}' lacks mandatory multi-tenant isolation field 'tenant_id'.`,
            filePath,
            severity: 'CRITICAL',
            remediation: "Add 'tenant_id String' to ensure strict commercial tenant isolation.",
          });
        }

        // Enforce Financial precision
        if (hasRawFloat) {
          issues.push({
            id: `PARITY-FLOAT-PRISMA-${modelName}`,
            moduleNumber: 32,
            message: `Model '${modelName}' uses raw Float for monetary calculations.`,
            filePath,
            severity: 'HIGH',
            remediation: "Use '@db.Decimal(12, 2)' or minor integer units to avoid floating-point balance corruption.",
          });
        }
      }
    } catch (e) {}
  }

  private parseTypeScriptModels(filePath: string, models: IDiscoveredModel[], issues: IModuleIssue[]): void {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const interfaceRegex = /(?:interface|type|class)\s+([A-Za-z0-9_]+)(?:<[^>]+>)?\s*(?:extends\s+[A-Za-z0-9_,\s]+)?\s*\{([^}]+)\}/g;
      let match;

      while ((match = interfaceRegex.exec(content)) !== null) {
        const modelName = match[1];
        // Skip helper interfaces
        if (modelName.startsWith('IModule') || modelName.startsWith('IRule') || modelName.startsWith('ILocale') || modelName.endsWith('Props') || modelName.endsWith('State')) {
          continue;
        }

        const body = match[2];
        const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && l.includes(':'));
        const fields = lines.map(l => l.split(':')[0].replace(/[?!]/g, '').trim());

        const hasTenantId = fields.some(f => /^(tenant_id|business_id|organization_id|tenantId|businessId)$/i.test(f));
        const hasSoftDelete = fields.some(f => /^(deleted_at|deletedAt|is_deleted|isDeleted)$/i.test(f));
        const hasAuditFields = fields.some(f => /^(created_at|createdAt)$/i.test(f));
        const hasRawFloat = fields.some(f => /(amount|balance|price)/i.test(f)) && body.includes('number');

        models.push({
          name: modelName,
          filePath,
          fields,
          hasTenantId,
          hasSoftDelete,
          hasAuditFields,
          hasRawFloat,
        });

        // Audit business models
        const isBusinessEntity = /(member|invoice|receipt|deposit|expense|loan|user|customer|product|order|ledger)/i.test(modelName);
        if (isBusinessEntity && !hasTenantId) {
          issues.push({
            id: `PARITY-TENANT-TS-${modelName}`,
            moduleNumber: 32,
            message: `TypeScript model '${modelName}' represents business data but is missing 'tenant_id'.`,
            filePath,
            severity: 'HIGH',
            remediation: "Add 'tenant_id: string;' to ensure multi-tenant security.",
          });
        }
      }
    } catch (e) {}
  }

  private parseDartModels(filePath: string, models: IDiscoveredModel[], issues: IModuleIssue[]): void {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const classRegex = /class\s+([A-Za-z0-9_]+)\s*(?:extends\s+[A-Za-z0-9_]+)?\s*\{([^}]+)\}/g;
      let match;

      while ((match = classRegex.exec(content)) !== null) {
        const modelName = match[1];
        if (modelName.endsWith('State') || modelName.endsWith('Screen') || modelName.endsWith('Widget') || modelName.endsWith('Controller')) {
          continue;
        }

        const body = match[2];
        const fieldRegex = /(?:final\s+)?(?:[A-Za-z0-9_<>?]+\s+)+([A-Za-z0-9_]+)\s*;/g;
        const fields: string[] = [];
        let fMatch;
        while ((fMatch = fieldRegex.exec(body)) !== null) {
          fields.push(fMatch[1]);
        }

        const hasTenantId = fields.some(f => /^(tenant_id|business_id|tenantId|businessId)$/i.test(f));
        const hasSoftDelete = fields.some(f => /^(deleted_at|deletedAt|isDeleted)$/i.test(f));
        const hasAuditFields = fields.some(f => /^(created_at|createdAt)$/i.test(f));
        const hasRawFloat = fields.some(f => /(amount|balance|price)/i.test(f)) && body.includes('double ');

        models.push({
          name: modelName,
          filePath,
          fields,
          hasTenantId,
          hasSoftDelete,
          hasAuditFields,
          hasRawFloat,
        });

        if (hasRawFloat) {
          issues.push({
            id: `PARITY-DART-FLOAT-${modelName}`,
            moduleNumber: 32,
            message: `Flutter model '${modelName}' uses primitive 'double' for financial fields.`,
            filePath,
            severity: 'MEDIUM',
            remediation: 'Use Decimal or minor integer units to avoid currency rounding drift.',
          });
        }
      }
    } catch (e) {}
  }

  private parseSqlDdl(filePath: string, models: IDiscoveredModel[], issues: IModuleIssue[]): void {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_."]+)\s*\(([\s\S]*?)\);/gi;
      let match;

      while ((match = tableRegex.exec(content)) !== null) {
        const tableName = match[1].replace(/["']/g, '');
        const body = match[2];
        const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--') && !l.startsWith('CONSTRAINT') && !l.startsWith('PRIMARY'));
        const fields = lines.map(l => l.split(/\s+/)[0].replace(/["']/g, ''));

        const hasTenantId = fields.some(f => /^(tenant_id|business_id|organization_id)$/i.test(f));
        const hasSoftDelete = fields.some(f => /^(deleted_at|is_deleted)$/i.test(f));
        const hasAuditFields = fields.some(f => /^(created_at)$/i.test(f)) && fields.some(f => /^(updated_at)$/i.test(f));
        const hasRawFloat = /(float|real|double\s+precision)/i.test(body) && /(amount|price|balance|total)/i.test(body);

        models.push({
          name: tableName,
          filePath,
          fields,
          hasTenantId,
          hasSoftDelete,
          hasAuditFields,
          hasRawFloat,
        });

        const isBusinessTable = /(members|invoices|receipts|deposits|expenses|loans|users|customers|products|orders|ledgers)/i.test(tableName);
        if (isBusinessTable && !hasTenantId) {
          issues.push({
            id: `PARITY-SQL-TENANT-${tableName}`,
            moduleNumber: 32,
            message: `SQL table '${tableName}' has no 'tenant_id' column for tenant isolation.`,
            filePath,
            severity: 'CRITICAL',
            remediation: "Add 'tenant_id UUID NOT NULL' column to enforce multi-tenant separation.",
          });
        }

        if (isBusinessTable && !hasSoftDelete) {
          issues.push({
            id: `PARITY-SQL-SOFTDELETE-${tableName}`,
            moduleNumber: 32,
            message: `Financial/audit table '${tableName}' has no 'deleted_at' column for soft-delete.`,
            filePath,
            severity: 'HIGH',
            remediation: "Add 'deleted_at TIMESTAMP WITH TIME ZONE' to prevent irreversible physical record loss.",
          });
        }
      }
    } catch (e) {}
  }

  private crossCheckModelParity(models: IDiscoveredModel[], issues: IModuleIssue[]): void {
    const modelsByName = new Map<string, IDiscoveredModel[]>();
    for (const m of models) {
      const cleanName = m.name.replace(/^I/, '').toLowerCase();
      const list = modelsByName.get(cleanName) || [];
      list.push(m);
      modelsByName.set(cleanName, list);
    }

    for (const [cleanName, group] of modelsByName.entries()) {
      if (group.length > 1) {
        // Compare models across platforms
        const base = group[0];
        for (let i = 1; i < group.length; i++) {
          const comp = group[i];
          const missingInComp = base.fields.filter(f => !comp.fields.includes(f) && !['created_at', 'updated_at', 'deleted_at'].includes(f));
          if (missingInComp.length > 2) {
            issues.push({
              id: `PARITY-MISMATCH-${cleanName}`,
              moduleNumber: 32,
              message: `Field mismatch detected between '${base.name}' (${path.basename(base.filePath)}) and '${comp.name}' (${path.basename(comp.filePath)}): Missing fields: ${missingInComp.slice(0, 3).join(', ')}.`,
              filePath: comp.filePath,
              severity: 'HIGH',
              remediation: 'Synchronize cross-platform DTO contract fields to prevent deserialization errors.',
            });
          }
        }
      }
    }
  }
}
