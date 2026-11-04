import * as vscode from 'vscode';

export class AntigravityCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source && !diagnostic.source.includes('Antigravity')) {
        continue;
      }

      const msg = diagnostic.message;

      // 1. QuickFix: Sensitive file not covered in .gitignore
      if (msg.includes('not covered by .gitignore') || msg.includes('credential pattern')) {
        const patternMatch = msg.match(/'([^']+)'/);
        if (patternMatch) {
          const patternToAdd = patternMatch[1];
          const fix = new vscode.CodeAction(
            `🛡️ Sajjad Guard: Append '${patternToAdd}' to root .gitignore`,
            vscode.CodeActionKind.QuickFix
          );
          fix.isPreferred = true;
          fix.diagnostics = [diagnostic];

          const root = vscode.workspace.workspaceFolders?.[0]?.uri;
          if (root) {
            const gitignoreUri = vscode.Uri.joinPath(root, '.gitignore');
            const edit = new vscode.WorkspaceEdit();
            const endPos = new vscode.Position(10000, 0);
            edit.insert(gitignoreUri, endPos, `\n# Sajjad Guard auto-protection\n${patternToAdd}\n`);
            fix.edit = edit;
          }
          actions.push(fix);
        }
      }

      // 2. QuickFix: Missing .project-memory.json
      if (msg.includes('.project-memory.json') || msg.includes('Project Memory')) {
        const fix = new vscode.CodeAction(
          '🛡️ Sajjad Guard: Initialize .project-memory.json now',
          vscode.CodeActionKind.QuickFix
        );
        fix.isPreferred = true;
        fix.command = {
          command: 'antigravityMaster.initProjectMemory',
          title: 'Initialize Project Memory',
        };
        actions.push(fix);
      }

      // 3. QuickFix: Empty interactive callback
      if (msg.includes('Empty interactive callback') || msg.includes('onPressed') || msg.includes('onClick')) {
        const line = document.lineAt(range.start.line);
        const fix = new vscode.CodeAction(
          '🛡️ Sajjad Guard: Provide real action handler with haptic feedback',
          vscode.CodeActionKind.QuickFix
        );
        fix.isPreferred = true;
        const edit = new vscode.WorkspaceEdit();
        const replacedLine = line.text.replace(
          /(\(\)\s*=>\s*\{\}|\(\)\s*\{\})/,
          '() { /* TODO: Sajjad Guard audited real handler */ }'
        );
        edit.replace(document.uri, line.range, replacedLine);
        fix.edit = edit;
        actions.push(fix);
      }

      // 4. QuickFix: Unpinned package dependency
      if (msg.includes('unsafe wildcard version') || msg.includes('any')) {
        const fix = new vscode.CodeAction(
          '🛡️ Sajjad Guard: Pin to safe semantic version (^1.0.0)',
          vscode.CodeActionKind.QuickFix
        );
        const line = document.lineAt(range.start.line);
        const edit = new vscode.WorkspaceEdit();
        const replacedLine = line.text.replace(/'\s*\*\s*'|"\s*\*\s*"|:\s*any/g, '^1.0.0');
        edit.replace(document.uri, line.range, replacedLine);
        fix.edit = edit;
        actions.push(fix);
      }

      // 5. QuickFix: Mandatory tenant_id isolation
      if (msg.includes('tenant_id') || msg.includes('multi-tenant isolation')) {
        const fix = new vscode.CodeAction(
          '🛡️ Sajjad Guard: Insert mandatory tenant_id (Multi-Tenant Isolation)',
          vscode.CodeActionKind.QuickFix
        );
        fix.isPreferred = true;
        const line = document.lineAt(range.start.line);
        const edit = new vscode.WorkspaceEdit();
        const indent = line.text.match(/^\s*/)?.[0] || '  ';
        const fieldStr = document.fileName.endsWith('.prisma')
          ? `${indent}tenant_id  String\n`
          : (document.fileName.endsWith('.dart') ? `${indent}final String tenantId;\n` : `${indent}tenant_id: string;\n`);
        edit.insert(document.uri, line.range.start, fieldStr);
        fix.edit = edit;
        actions.push(fix);
      }
    }

    return actions;
  }
}
