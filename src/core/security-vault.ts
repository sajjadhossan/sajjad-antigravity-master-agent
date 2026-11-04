import * as vscode from 'vscode';

export class SecurityVault {
  private static instance: SecurityVault;
  private secretStorage?: vscode.SecretStorage;

  // Patterns for dangerous or irreversible system commands
  private readonly destructivePatterns: RegExp[] = [
    /\brm\s+(-rf?|-fr?)\s+([~/]|\*)/i,
    /\bmkfs(\.\w+)?\b/i,
    /\bformat\s+[a-z]:/i,
    /\b(drop\s+(database|table|schema))\b/i,
    /\btruncate\s+table\b/i,
    /\bgit\s+push\s+.*(--force|-f).*\b(main|master|production)\b/i,
    /\b(del|erase)\s+\/[sS]\s+[a-zA-Z]:/i,
  ];

  // Patterns for confidential tokens and secrets that MUST be redacted
  private readonly secretPatterns: Array<{ name: string; regex: RegExp }> = [
    { name: 'GitHub Token', regex: /ghp_[a-zA-Z0-9]{36}/g },
    { name: 'Google/Firebase API Key', regex: /AIza[0-9A-Za-z-_]{35}/g },
    { name: 'Private Key', regex: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z]+ )?PRIVATE KEY-----/g },
    { name: 'OpenAI Secret Key', regex: /sk-[a-zA-Z0-9]{32,}/g },
    { name: 'Database Connection String with Password', regex: /postgres:\/\/[^:]+:([^@]+)@/g },
  ];

  private constructor() {}

  public static getInstance(): SecurityVault {
    if (!SecurityVault.instance) {
      SecurityVault.instance = new SecurityVault();
    }
    return SecurityVault.instance;
  }

  public init(context: vscode.ExtensionContext): void {
    this.secretStorage = context.secrets;
  }

  /**
   * Evaluates command safety. If command is destructive, prompts the user for explicit confirmation.
   * Returns true if safe to proceed, false if denied or cancelled.
   */
  public async verifyCommandExecution(command: string): Promise<boolean> {
    for (const pattern of this.destructivePatterns) {
      if (pattern.test(command)) {
        const warning = `🛡️ [CRITICAL SECURITY] Antigravity intercepted a potentially destructive command:\n"${command}"\nExecution is blocked unless explicitly confirmed.`;
        const choice = await vscode.window.showWarningMessage(
          warning,
          { modal: true },
          'Abort (Recommended)',
          'I Understand the Risks, Proceed'
        );

        return choice === 'I Understand the Risks, Proceed';
      }
    }
    return true;
  }

  /**
   * Masks any detected secrets or private tokens in logs, diagnostics, or UI displays.
   */
  public maskSecrets(text: string): string {
    if (!text) {
      return '';
    }
    let sanitized = text;
    for (const secret of this.secretPatterns) {
      sanitized = sanitized.replace(secret.regex, (match) => {
        if (match.length <= 8) {
          return '***REDACTED***';
        }
        return `${match.substring(0, 4)}...[${secret.name} REDACTED]...${match.substring(match.length - 4)}`;
      });
    }
    return sanitized;
  }

  /**
   * Returns list of secret regex patterns for scanning
   */
  public getSecretPatterns(): Array<{ name: string; regex: RegExp }> {
    return this.secretPatterns;
  }

  /**
   * Scans a workspace for hardcoded plaintext credentials and tokens
   */
  public async scanWorkspaceForSecrets(workspaceRoot: string): Promise<Array<{
    file: string;
    line: number;
    secretType: string;
    maskedPreview: string;
  }>> {
    const fs = await import('fs');
    const path = await import('path');
    const detected: Array<{ file: string; line: number; secretType: string; maskedPreview: string }> = [];

    const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'out', 'build', '.vscode-test']);

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
            const allowedExts = ['.ts', '.js', '.dart', '.json', '.env', '.yaml', '.yml', '.xml', '.properties', '.html'];
            if (!allowedExts.includes(ext) && !entry.name.startsWith('.env')) {
              continue;
            }
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              const lines = content.split('\n');
              for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                const line = lines[lineIdx];
                for (const pat of SecurityVault.getInstance().secretPatterns) {
                  pat.regex.lastIndex = 0;
                  const match = pat.regex.exec(line);
                  if (match) {
                    detected.push({
                      file: fullPath,
                      line: lineIdx + 1,
                      secretType: pat.name,
                      maskedPreview: SecurityVault.getInstance().maskSecrets(match[0]),
                    });
                  }
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    walkDir(workspaceRoot);
    return detected;
  }
  public async storeSecret(key: string, value: string): Promise<void> {
    if (this.secretStorage) {
      await this.secretStorage.store(key, value);
    }
  }

  /**
   * Securely retrieves credential from VS Code SecretStorage
   */
  public async getSecret(key: string): Promise<string | undefined> {
    if (this.secretStorage) {
      return await this.secretStorage.get(key);
    }
    return undefined;
  }
}
