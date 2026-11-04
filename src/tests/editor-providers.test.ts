import * as assert from 'assert';
import { AntigravityCodeActionProvider } from '../editor/code-action.provider';
import { AntigravityCodeLensProvider } from '../editor/codelens.provider';

export function runEditorProvidersTests() {
  console.log('Running Editor Providers (CodeLens & QuickFix) Tests...');

  // 1. CodeActionProvider test
  const actionProvider = new AntigravityCodeActionProvider();
  assert.ok(actionProvider, 'AntigravityCodeActionProvider must instantiate');
  assert.strictEqual(
    AntigravityCodeActionProvider.providedCodeActionKinds.length,
    1,
    'Must provide QuickFix action kind'
  );

  const mockDoc: any = {
    uri: { fsPath: '/test/workspace/.gitignore' },
    lineAt: () => ({
      text: 'onPressed: () {}',
      range: { start: { line: 10, character: 0 }, end: { line: 10, character: 16 } },
    }),
  };

  const mockContext: any = {
    diagnostics: [
      {
        source: 'Antigravity Guard',
        message: "Sensitive credential file 'key.properties' is not covered by .gitignore!",
      },
      {
        source: 'Antigravity Guard',
        message: 'Empty interactive callback detected (onPressed).',
      },
    ],
  };

  const actions = actionProvider.provideCodeActions(
    mockDoc,
    { start: { line: 10, character: 0 }, end: { line: 10, character: 16 } } as any,
    mockContext,
    {} as any
  );

  assert.ok(actions.length >= 2, 'Should generate quick fixes for gitignore and empty callback');
  assert.ok(actions.some(a => a.title.includes('key.properties')), 'Must include gitignore append quick fix');
  assert.ok(actions.some(a => a.title.includes('real action handler')), 'Must include handler quick fix');

  // 2. CodeLensProvider test
  const lensProvider = new AntigravityCodeLensProvider();
  assert.ok(lensProvider, 'AntigravityCodeLensProvider must instantiate');

  const mockCodeDoc: any = {
    getText: () => `export class MemberRepository {\n  async getMembers() {}\n}`,
    positionAt: () => ({ line: 0, character: 0 }),
  };

  const lenses = lensProvider.provideCodeLenses(mockCodeDoc, {} as any);
  assert.ok(lenses.length > 0, 'CodeLens must be generated for class declarations');
  assert.ok(lenses.some(l => l.command && l.command.title.includes('Sajjad Guard')), 'Must include Sajjad Guard CodeLens');

  console.log('✔ Editor Providers (CodeLens & QuickFix) tests passed successfully.');
}
