import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FinancialLedgerGuardService } from '../finance/financial-ledger-guard.service';

export async function runFinancialGuardTests(): Promise<void> {
  console.log('Running Financial & Ledger Guard Tests...');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-fin-guard-'));

  try {
    const finService = FinancialLedgerGuardService.getInstance();

    // 1. Test Thermal Receipt & Digital Signature Generation
    const receipt = finService.generateThermalReceipt();
    assert.strictEqual(receipt.currency, 'BDT', 'Currency standard must be BDT');
    assert.strictEqual(typeof receipt.grandTotal, 'number');
    assert.strictEqual(receipt.items.length >= 1, true, 'Receipt must have line items');
    assert.strictEqual(receipt.signature.length > 8, true, 'Must have cryptographic signature');
    assert.strictEqual(receipt.qrPayload.includes('verifyUrl'), true, 'QR payload must include verification URL');

    const html = finService.generateThermalReceiptHtml(receipt);
    assert.strictEqual(html.includes(receipt.businessName), true, 'HTML preview must contain business name');
    assert.strictEqual(html.includes(receipt.invoiceNo), true, 'HTML preview must contain invoice number');
    assert.strictEqual(html.includes('80mm thermal receipt width'), true, 'Must have standard 80mm container');

    // 2. Test Financial Float Math Detection
    const prismaPath = path.join(tempDir, 'schema.prisma');
    fs.writeFileSync(
      prismaPath,
      `model Deposit {\n  id String @id\n  amount Float\n  tenant_id String\n}\n`,
      'utf8'
    );

    const tsPath = path.join(tempDir, 'payment.ts');
    fs.writeFileSync(
      tsPath,
      `export function processDue(amount: string) {\n  const parsed = parseFloat(amount);\n  return parsed * 1.05;\n}\n`,
      'utf8'
    );

    const queryPath = path.join(tempDir, 'repository.ts');
    fs.writeFileSync(
      queryPath,
      `export async function getDeposits(prisma: any) {\n  return prisma.deposit.findMany({\n    where: {\n      status: 'APPROVED'\n    }\n  });\n}\n`,
      'utf8'
    );

    const audit = await finService.auditFinancialIntegrity(tempDir);
    assert.strictEqual(audit.floatMathCount >= 2, true, 'Must detect both Prisma float and parseFloat money risks');
    assert.strictEqual(audit.tenantQueryGaps >= 1, true, 'Must detect missing tenant_id query filter');

    console.log('✔ Financial & Ledger Guard tests passed successfully.');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
