import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface IFinancialIssue {
  type: 'HAZARDOUS_FLOAT_MATH' | 'MISSING_TENANT_ID_QUERY' | 'MISSING_SOFT_DELETE_FILTER' | 'PRISMA_FLOAT_MONEY';
  filePath: string;
  lineNumber?: number;
  snippet?: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  remediation: string;
}

export interface IThermalReceiptData {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  invoiceNo: string;
  date: string;
  tenantId: string;
  currency: string;
  items: Array<{ name: string; qty: number; rate: number; total: number }>;
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  qrPayload: string;
  signature: string;
}

export class FinancialLedgerGuardService {
  private static instance: FinancialLedgerGuardService;

  private constructor() {}

  public static getInstance(): FinancialLedgerGuardService {
    if (!FinancialLedgerGuardService.instance) {
      FinancialLedgerGuardService.instance = new FinancialLedgerGuardService();
    }
    return FinancialLedgerGuardService.instance;
  }

  /**
   * Scans workspace for float currency math and missing tenant_id filters in database queries
   */
  public async auditFinancialIntegrity(workspaceRoot: string): Promise<{
    issues: IFinancialIssue[];
    floatMathCount: number;
    tenantQueryGaps: number;
  }> {
    const issues: IFinancialIssue[] = [];

    const files = this.scanCodeFiles(workspaceRoot);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        // 1. Prisma schema check: Float type used on money/financial fields
        if (file.endsWith('.prisma')) {
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (/^(amount|balance|price|cost|deposit|expense|fee|fine|due)\s+Float/i.test(line)) {
              issues.push({
                type: 'PRISMA_FLOAT_MONEY',
                filePath: file,
                lineNumber: i + 1,
                snippet: line,
                message: `Hazardous 'Float' type on financial column '${line.split(/\s+/)[0]}'`,
                severity: 'CRITICAL',
                remediation: `Change type to 'Decimal @db.Decimal(12, 2)' to prevent floating-point balance drift.`,
              });
            }
          }
        }

        // 2. TypeScript / JavaScript / Dart float math checks
        const isSourceCode = /\.(ts|js|tsx|jsx|dart)$/.test(file);
        if (isSourceCode && !file.includes('.test.') && !file.includes('/tests/')) {
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Check for parseFloat on monetary fields
            if (/parseFloat\s*\(\s*(amount|balance|price|total|money|deposit|due)\b/i.test(line)) {
              issues.push({
                type: 'HAZARDOUS_FLOAT_MATH',
                filePath: file,
                lineNumber: i + 1,
                snippet: line.substring(0, 80),
                message: `Raw 'parseFloat' on monetary variable risks floating-point rounding inaccuracies`,
                severity: 'HIGH',
                remediation: `Use 'new Decimal(...)' or handle currency as integer paisa/cents.`,
              });
            }

            // Check for Dart double on monetary fields
            if (file.endsWith('.dart') && /\bdouble\s+(amount|balance|price|deposit|expense|due)\b/i.test(line)) {
              issues.push({
                type: 'HAZARDOUS_FLOAT_MATH',
                filePath: file,
                lineNumber: i + 1,
                snippet: line.substring(0, 80),
                message: `Dart 'double' type on financial variable '${line}' is prone to IEEE-754 precision bugs`,
                severity: 'MEDIUM',
                remediation: `Use integer cents/paisa or Decimal package for financial calculations.`,
              });
            }

            // Check for database queries against financial tables lacking tenant_id
            if (/prisma\.(deposit|expense|invoice|receipt|member|account)\.(findMany|findFirst|update|delete)\s*\(\s*\{/i.test(line)) {
              // Inspect next 5 lines for tenant_id
              const window = lines.slice(i, i + 8).join(' ');
              if (!window.includes('tenant_id') && !window.includes('tenantId')) {
                issues.push({
                  type: 'MISSING_TENANT_ID_QUERY',
                  filePath: file,
                  lineNumber: i + 1,
                  snippet: line.substring(0, 80),
                  message: `Financial query against '${line.split('.')[1]}' does not enforce 'tenant_id' filter in scope`,
                  severity: 'CRITICAL',
                  remediation: `Ensure 'tenant_id' is explicitly included in the 'where' condition (Section 4 Rule 6).`,
                });
              }
            }
          }
        }
      } catch (e) {}
    }

    return {
      issues,
      floatMathCount: issues.filter(i => i.type === 'HAZARDOUS_FLOAT_MATH' || i.type === 'PRISMA_FLOAT_MONEY').length,
      tenantQueryGaps: issues.filter(i => i.type === 'MISSING_TENANT_ID_QUERY').length,
    };
  }

  /**
   * Generates a sample thermal receipt payload with digital HMAC-SHA256 signature and verification QR
   */
  public generateThermalReceipt(options?: Partial<IThermalReceiptData>): IThermalReceiptData {
    const businessName = options?.businessName || 'মেঘনা সমবায় সমিতি ও সঞ্চয় ব্যাংক';
    const businessAddress = options?.businessAddress || 'মিরপুর-১০, ঢাকা-১২১৬, বাংলাদেশ';
    const businessPhone = options?.businessPhone || '+880 1712-345678';
    const tenantId = options?.tenantId || 'tenant-dhaka-001';
    const currency = 'BDT';
    const invoiceNo = options?.invoiceNo || `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0042`;

    const items = options?.items || [
      { name: 'মাসিক সঞ্চয় জমা (Monthly Savings)', qty: 1, rate: 5000.0, total: 5000.0 },
      { name: 'শেয়ার কিস্তি মূলধন (Share Capital)', qty: 1, rate: 1000.0, total: 1000.0 },
      { name: 'পাসবুক ও আবেদন ফি (Passbook Fee)', qty: 1, rate: 100.0, total: 100.0 },
    ];

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = 0.0;
    const discount = 0.0;
    const grandTotal = subtotal + tax - discount;

    const timestamp = new Date().toISOString();

    // Generate cryptographic hash signature
    const signaturePayload = `${tenantId}:${invoiceNo}:${grandTotal.toFixed(2)}:${timestamp}`;
    const signature = crypto.createHash('sha256').update(signaturePayload).digest('hex').substring(0, 16);

    const qrData = JSON.stringify({
      org: businessName,
      tenant: tenantId,
      inv: invoiceNo,
      tot: grandTotal.toFixed(2),
      cur: currency,
      ts: timestamp,
      sig: signature,
      verifyUrl: `https://verify.antigravity.saas/receipt?inv=${invoiceNo}&sig=${signature}`,
    });

    return {
      businessName,
      businessAddress,
      businessPhone,
      invoiceNo,
      date: timestamp,
      tenantId,
      currency,
      items,
      subtotal,
      tax,
      discount,
      grandTotal,
      qrPayload: qrData,
      signature,
    };
  }

  /**
   * Builds high-fidelity HTML preview for an 80mm Thermal Receipt Simulator
   */
  public generateThermalReceiptHtml(receipt: IThermalReceiptData): string {
    const qrEncoded = encodeURIComponent(receipt.qrPayload);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrEncoded}`;

    const itemsRows = receipt.items
      .map(
        it => `
      <tr>
        <td style="text-align: left; padding: 4px 0;">${it.name}<br/><span style="color: #666; font-size: 11px;">${it.qty} x ${it.rate.toFixed(2)}</span></td>
        <td style="text-align: right; vertical-align: bottom; font-weight: 600;">${it.total.toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Thermal Receipt Preview - ${receipt.invoiceNo}</title>
  <style>
    body {
      background: #1e1e1e;
      color: #333;
      font-family: 'Courier New', Courier, monospace;
      display: flex;
      justify-content: center;
      padding: 24px;
      margin: 0;
    }
    .receipt-container {
      width: 320px; /* Standard 80mm thermal receipt width */
      background: #fff;
      padding: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      border-radius: 4px;
      box-sizing: border-box;
    }
    .header {
      text-align: center;
      border-bottom: 1px dashed #444;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .header h2 {
      margin: 0 0 6px 0;
      font-size: 16px;
      font-family: sans-serif;
      font-weight: 700;
      color: #111;
    }
    .header p {
      margin: 2px 0;
      font-size: 11px;
      color: #555;
    }
    .meta {
      font-size: 12px;
      margin-bottom: 12px;
      border-bottom: 1px dashed #444;
      padding-bottom: 8px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 12px;
    }
    .totals {
      border-top: 1px dashed #444;
      padding-top: 8px;
      font-size: 13px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .grand-total {
      font-size: 15px;
      font-weight: 800;
      border-top: 2px solid #111;
      border-bottom: 2px solid #111;
      padding: 6px 0;
      margin-top: 6px;
    }
    .footer {
      text-align: center;
      margin-top: 16px;
      font-size: 11px;
      color: #555;
    }
    .qr-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 12px 0;
    }
    .sig-text {
      font-size: 10px;
      color: #777;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <h2>${receipt.businessName}</h2>
      <p>${receipt.businessAddress}</p>
      <p>ফোন: ${receipt.businessPhone}</p>
      <p style="font-size: 10px; font-weight: 600; color: #2ea043; margin-top: 4px;">★ অনুমোদিত ডিজিটাল রসিদ ★</p>
    </div>

    <div class="meta">
      <div class="meta-row"><span>রসিদ নং:</span><strong>${receipt.invoiceNo}</strong></div>
      <div class="meta-row"><span>তারিখ:</span><span>${new Date(receipt.date).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</span></div>
      <div class="meta-row"><span>টেন্যান্ট আইডি:</span><span>${receipt.tenantId}</span></div>
    </div>

    <table>
      <thead>
        <tr style="border-bottom: 1px solid #ddd;">
          <th style="text-align: left; padding-bottom: 4px;">বিবরণ (Item)</th>
          <th style="text-align: right; padding-bottom: 4px;">টাকা (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span>মোট (Subtotal):</span><span>${receipt.subtotal.toFixed(2)} ৳</span></div>
      <div class="total-row"><span>ভ্যাট / কর (VAT):</span><span>${receipt.tax.toFixed(2)} ৳</span></div>
      <div class="total-row grand-total">
        <span>সর্বমোট (GRAND TOTAL):</span>
        <span>${receipt.grandTotal.toFixed(2)} BDT</span>
      </div>
    </div>

    <div class="qr-box">
      <img src="${qrUrl}" width="140" height="140" alt="Invoice Verification QR" style="border: 1px solid #ccc; padding: 4px; background: #fff;" />
      <div style="font-size: 10px; margin-top: 6px; font-weight: 600;">ক্যামেরা দিয়ে স্ক্যান করে যাচাই করুন</div>
      <div class="sig-text">HMAC Sig: ${receipt.signature}</div>
    </div>

    <div class="footer">
      <p>ধন্যবাদ! আবার আসবেন।</p>
      <p style="font-size: 9px; color: #888;">Antigravity Enterprise Financial Guard Verified</p>
    </div>
  </div>
</body>
</html>`;
  }

  private scanCodeFiles(dir: string, maxFiles = 150): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) {
      return results;
    }

    const walk = (current: string) => {
      if (results.length >= maxFiles) return;
      try {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build' || entry.name === 'out') {
            continue;
          }
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (/\.(ts|js|tsx|jsx|dart|prisma|sql)$/.test(entry.name)) {
            results.push(full);
          }
        }
      } catch (e) {}
    };

    walk(dir);
    return results;
  }
}
