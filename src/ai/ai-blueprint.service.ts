import * as fs from 'fs';
import * as path from 'path';

export interface IWorkspaceTechStack {
  language: 'typescript' | 'javascript' | 'dart' | 'mixed';
  framework: 'nextjs' | 'react' | 'express' | 'flutter' | 'node' | 'generic';
  orm: 'prisma' | 'drizzle' | 'typeorm' | 'sql' | 'none';
  hasMultiTenant: boolean;
  hasBilingualSupport: boolean;
}

export interface IGeneratedBlueprint {
  title: string;
  slug: string;
  filePath: string;
  markdownContent: string;
  techStack: IWorkspaceTechStack;
}

export class AiBlueprintService {
  private static instance: AiBlueprintService;

  private constructor() {}

  public static getInstance(): AiBlueprintService {
    if (!AiBlueprintService.instance) {
      AiBlueprintService.instance = new AiBlueprintService();
    }
    return AiBlueprintService.instance;
  }

  /**
   * Introspects workspace files to identify frameworks, ORMs, and design patterns
   */
  public detectTechStack(workspaceRoot: string): IWorkspaceTechStack {
    let language: IWorkspaceTechStack['language'] = 'generic' as any;
    let framework: IWorkspaceTechStack['framework'] = 'generic';
    let orm: IWorkspaceTechStack['orm'] = 'none';
    let hasMultiTenant = false;
    let hasBilingualSupport = false;

    const pkgPath = path.join(workspaceRoot, 'package.json');
    const pubspecPath = path.join(workspaceRoot, 'pubspec.yaml');
    const prismaPath = path.join(workspaceRoot, 'prisma', 'schema.prisma');

    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

        language = deps['typescript'] || fs.existsSync(path.join(workspaceRoot, 'tsconfig.json')) ? 'typescript' : 'javascript';

        if (deps['next']) {
          framework = 'nextjs';
        } else if (deps['express']) {
          framework = 'express';
        } else if (deps['react']) {
          framework = 'react';
        } else {
          framework = 'node';
        }

        if (deps['@prisma/client'] || fs.existsSync(prismaPath)) {
          orm = 'prisma';
        } else if (deps['drizzle-orm']) {
          orm = 'drizzle';
        } else if (deps['typeorm']) {
          orm = 'typeorm';
        }
      } catch (e) {}
    } else if (fs.existsSync(pubspecPath)) {
      language = 'dart';
      framework = 'flutter';
    }

    // Check for multi-tenant hints
    if (fs.existsSync(prismaPath)) {
      const content = fs.readFileSync(prismaPath, 'utf8');
      if (content.includes('tenant_id') || content.includes('tenantId')) {
        hasMultiTenant = true;
      }
    }

    // Check for i18n hints
    const i18nDir = path.join(workspaceRoot, 'src', 'i18n');
    const localesDir = path.join(workspaceRoot, 'locales');
    if (fs.existsSync(i18nDir) || fs.existsSync(localesDir)) {
      hasBilingualSupport = true;
    }

    return {
      language,
      framework,
      orm,
      hasMultiTenant,
      hasBilingualSupport,
    };
  }

  /**
   * Generates a commercial-grade, production-ready architectural blueprint for a requested feature
   */
  public generateBlueprint(workspaceRoot: string, featureGoal: string): IGeneratedBlueprint {
    const stack = this.detectTechStack(workspaceRoot);
    const slug = featureGoal
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40) || 'feature-blueprint';

    const timestamp = new Date().toISOString();
    const entityName = this.toPascalCase(slug);

    const blueprintDir = path.join(workspaceRoot, '.antigravity', 'blueprints');
    if (!fs.existsSync(blueprintDir)) {
      fs.mkdirSync(blueprintDir, { recursive: true });
    }

    const filePath = path.join(blueprintDir, `${slug}.md`);

    const markdownContent = `# 📐 Antigravity Architecture Blueprint: ${featureGoal}

> **Generated:** ${timestamp}  
> **Standard:** Universal Enterprise Architecture Protocol  
> **Default Currency:** BDT (৳) | **Default Timezone:** Asia/Dhaka  
> **Target Stack:** ${stack.language.toUpperCase()} | ${stack.framework.toUpperCase()} | ${stack.orm.toUpperCase()}

---

## 1. Executive Summary & Objective
- **Feature Name:** ${featureGoal}
- **Entity Identification:** \`${entityName}\`
- **Zero-Demo Mandate:** All forms, buttons, database actions, and calculations must be 100% operational with live API persistence.

---

## 2. Multi-Tenant Database Schema (${stack.orm === 'prisma' ? 'Prisma ORM' : 'PostgreSQL DDL'})

\`\`\`prisma
// Prisma Schema Definition for ${entityName}
model ${entityName} {
  id              String    @id @default(uuid())
  tenant_id       String    @db.VarChar(64)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  created_by      String?
  updated_by      String?
  deleted_at      DateTime? // Soft-delete mandate (Section 1 Rule 8)
  deleted_by      String?
  sync_version    Int       @default(1)
  is_synced       Boolean   @default(true)

  // Business Fields
  name            String    @db.VarChar(255)
  code            String?   @db.VarChar(50)
  amount          Decimal   @default(0.00) @db.Decimal(12, 2) // Fixed precision (No float bugs)
  status          String    @default("ACTIVE") // ACTIVE, PENDING, COMPLETED, CANCELLED
  notes           String?   @db.Text
  metadata        Json?     @default("{}")

  @@index([tenant_id])
  @@index([deleted_at])
  @@index([tenant_id, status])
  @@map("${slug.replace(/-/g, '_')}")
}
\`\`\`

---

## 3. Standard API Contract (Section 6 Specification)

### 3.1 Endpoint Specifications
- \`POST /api/v1/${slug}\` — Create record (Tenant isolated, requires RBAC permission)
- \`GET /api/v1/${slug}\` — List records (Filtered by \`tenant_id\` and \`deleted_at IS NULL\`)
- \`GET /api/v1/${slug}/:id\` — Retrieve single record
- \`PUT /api/v1/${slug}/:id\` — Update record with audit trail
- \`DELETE /api/v1/${slug}/:id\` — Soft-delete record with confirmation

### 3.2 Standard Success Response Format
\`\`\`json
{
  "success": true,
  "message": "${entityName} processed successfully",
  "data": {
    "id": "c1b2a345-6789-40ab-cdef-1234567890ab",
    "tenant_id": "tenant-corp-01",
    "name": "Sample Operation",
    "amount": "15000.00",
    "currency": "BDT",
    "status": "ACTIVE",
    "created_at": "${timestamp}",
    "sync_version": 1
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  },
  "errors": []
}
\`\`\`

### 3.3 Standard Error Format
\`\`\`json
{
  "success": false,
  "message": "Validation failed for ${entityName}",
  "errorCode": "validation_error",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be a positive decimal in BDT"
    }
  ]
}
\`\`\`

---

## 4. UI/UX Wireframe & Bilingual Localization
- **Navigation:** Accessible under relevant sub-menu (Max 6–8 top-level sidebar items).
- **Responsive Layout:** Mobile-first responsive card and data table layout.
- **States Required:** Loading Skeleton, Empty State, Error Alert, Success Confirmation, and Warning Dialog on Destructive Action.
- **Language Keys:**
  - \`bn\`: "${featureGoal} তালিকা", "নতুন রেকর্ড", "সম্পাদনা", "মুছে ফেলুন", "সংরক্ষণ করুন"
  - \`en\`: "${featureGoal} List", "New Record", "Edit", "Delete", "Save Changes"

---

## 5. Offline-First Synchronization & Idempotency
- **Client Offline Storage:** IndexedDB / SQLite pending-sync queue.
- **Idempotency Key:** Client-generated UUID (\`client_idempotency_key\`) sent in header to prevent duplicate financial records.
- **Conflict Strategy:** Server is authoritative for financial/balance states; local changes logged in audit trail.

---

## 6. Pre-Implementation Quality Checklist
- [ ] Schema contains \`tenant_id\` on every table with index.
- [ ] Soft-delete columns (\`deleted_at\`, \`deleted_by\`) present.
- [ ] Decimal precision (\`Decimal(12, 2)\`) used for all monetary amounts (BDT).
- [ ] RBAC permissions defined: Super Admin, Tenant Owner, Manager, Data Operator.
- [ ] Zero dummy buttons, zero sample text, zero mock returns.
- [ ] Audit log entry recorded on create, edit, and delete actions.
`;

    fs.writeFileSync(filePath, markdownContent, 'utf8');

    return {
      title: featureGoal,
      slug,
      filePath,
      markdownContent,
      techStack: stack,
    };
  }

  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }
}
