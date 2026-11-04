import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AiBlueprintService } from '../ai/ai-blueprint.service';
import { DeadCodePurgerService } from '../cleaner/dead-code-purger.service';

export async function runAiAndCleanerTests(): Promise<void> {
  console.log('Running AI Blueprint & Dead Code Purger Tests...');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-ai-cleaner-test-'));

  try {
    // 1. Test AiBlueprintService
    const aiService = AiBlueprintService.getInstance();

    // Create a mock package.json with Next.js & Prisma
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-saas',
        dependencies: {
          next: '^14.0.0',
          '@prisma/client': '^5.0.0',
          typescript: '^5.0.0',
        },
      }, null, 2),
      'utf8'
    );

    const stack = aiService.detectTechStack(tempDir);
    assert.strictEqual(stack.framework, 'nextjs');
    assert.strictEqual(stack.orm, 'prisma');
    assert.strictEqual(stack.language, 'typescript');

    const blueprint = aiService.generateBlueprint(tempDir, 'Member Loan Repayment Engine');
    assert.strictEqual(fs.existsSync(blueprint.filePath), true, 'Blueprint markdown file must exist');

    const content = fs.readFileSync(blueprint.filePath, 'utf8');
    assert.strictEqual(content.includes('tenant_id'), true, 'Must include tenant_id field');
    assert.strictEqual(content.includes('deleted_at'), true, 'Must include soft-delete deleted_at');
    assert.strictEqual(content.includes('BDT'), true, 'Must include BDT currency standard');
    assert.strictEqual(content.includes('Asia/Dhaka'), true, 'Must include Asia/Dhaka timezone standard');
    assert.strictEqual(content.includes('Decimal(12, 2)'), true, 'Must include fixed decimal precision');

    // 2. Test DeadCodePurgerService
    const cleaner = DeadCodePurgerService.getInstance();

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    const codeFilePath = path.join(srcDir, 'business.ts');
    fs.writeFileSync(
      codeFilePath,
      `export function calculateInterest(p: number, r: number) {\n  console.log('Calculating interest', p, r);\n  return p * r;\n}\n`,
      'utf8'
    );

    const assetDir = path.join(tempDir, 'assets');
    fs.mkdirSync(assetDir, { recursive: true });
    const orphanAssetPath = path.join(assetDir, 'unused-banner.png');
    fs.writeFileSync(orphanAssetPath, 'fake-png-content', 'utf8');

    const emptyDir = path.join(tempDir, 'empty-folder');
    fs.mkdirSync(emptyDir, { recursive: true });

    const audit = await cleaner.auditWorkspace(tempDir);
    assert.strictEqual(audit.consoleLogs >= 1, true, 'Should detect console.log statement');
    assert.strictEqual(audit.orphanAssets >= 1, true, 'Should detect orphaned asset');
    assert.strictEqual(audit.emptyDirectories >= 1, true, 'Should detect empty directory');

    // Test Purge
    const purgeResult = await cleaner.purgeIssues(tempDir, { removeConsoleLogs: true, removeEmptyDirs: true });
    assert.strictEqual(purgeResult.cleanedCount >= 1, true, 'Should clean items');

    const cleanedCode = fs.readFileSync(codeFilePath, 'utf8');
    assert.strictEqual(cleanedCode.includes('console.log'), false, 'Console log should be purged');

    console.log('✔ AI Blueprint & Dead Code Purger tests passed successfully.');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
