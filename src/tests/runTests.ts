import { runSecurityVaultTests } from './security-vault.test';
import { runModulesTests } from './modules.test';
import { runReleaseGateTests } from './release-gate.test';
import { runBackupAndDependencyTests } from './backup-and-dependencies.test';
import { runEditorProvidersTests } from './editor-providers.test';
import { runParityGuardTests } from './parity-guard.test';
import { runDevOpsAndTreeViewTests } from './devops-and-treeview.test';
import { runAiAndCleanerTests } from './ai-and-cleaner.test';
import { runFinancialGuardTests } from './financial-guard.test';

async function main() {
  console.log('====================================================');
  console.log('Antigravity Master Agent Test Runner');
  console.log('====================================================');

  try {
    runSecurityVaultTests();
    runModulesTests();
    runReleaseGateTests();
    await runBackupAndDependencyTests();
    runEditorProvidersTests();
    await runParityGuardTests();
    await runDevOpsAndTreeViewTests();
    await runAiAndCleanerTests();
    await runFinancialGuardTests();
    console.log('\n✅ ALL TEST SUITES PASSED SUCCESSFULLY (0 FAILURES).');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILURE:', err);
    process.exit(1);
  }
}

main();
