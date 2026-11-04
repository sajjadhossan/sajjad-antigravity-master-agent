import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WorkflowGeneratorService } from '../devops/workflow-generator.service';
import { AndroidPreflightService } from '../android/apk-preflight';
import { PillarTreeDataProvider, PillarTreeItemType } from '../views/pillar-tree.provider';

export async function runDevOpsAndTreeViewTests(): Promise<void> {
  console.log('Running DevOps & TreeView Tests...');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-devops-test-'));

  try {
    // 1. Test WorkflowGeneratorService
    const wfService = WorkflowGeneratorService.getInstance();
    const generated = wfService.generateEnterpriseWorkflows(tempDir, '8.2.0');
    assert.strictEqual(generated.length, 5, 'Should generate 5 enterprise workflows');

    const expectedFiles = [
      'android-release.yml',
      'web-vercel-deploy.yml',
      'desktop-build.yml',
      'dispatch-build.yml',
      'enterprise-ci.yml',
    ];

    for (const f of expectedFiles) {
      const p = path.join(tempDir, '.github', 'workflows', f);
      assert.strictEqual(fs.existsSync(p), true, `Workflow file ${f} must exist`);
      const content = fs.readFileSync(p, 'utf8');
      assert.strictEqual(content.includes('name:'), true, `${f} must include name definition`);
      assert.strictEqual(content.includes('jobs:'), true, `${f} must include jobs definition`);
    }

    const audit = wfService.auditWorkflows(tempDir);
    assert.strictEqual(audit.total, 5, 'Should find 5 workflows');
    assert.strictEqual(audit.valid, 5, 'All 5 workflows must be valid');
    assert.strictEqual(audit.issues.length, 0, 'Should have 0 workflow issues');

    // 2. Test Multi-Platform bumpVersion
    const pkgPath = path.join(tempDir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'test-app', version: '8.0.0' }, null, 2), 'utf8');

    const pubspecPath = path.join(tempDir, 'pubspec.yaml');
    fs.writeFileSync(pubspecPath, 'name: test_app\nversion: 8.0.0+1\n', 'utf8');

    const androidAppDir = path.join(tempDir, 'android', 'app');
    fs.mkdirSync(androidAppDir, { recursive: true });
    const gradlePath = path.join(androidAppDir, 'build.gradle');
    fs.writeFileSync(gradlePath, 'defaultConfig {\n  versionCode 80000\n  versionName "8.0.0"\n}\n', 'utf8');

    const preflight = AndroidPreflightService.getInstance();
    const updated = await preflight.bumpVersion(tempDir, '8.2.0');

    assert.strictEqual(updated.length >= 4, true, 'Should update package.json, pubspec, gradle and .version.json');

    const updatedPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    assert.strictEqual(updatedPkg.version, '8.2.0', 'package.json version must be 8.2.0');

    const updatedPub = fs.readFileSync(pubspecPath, 'utf8');
    assert.strictEqual(updatedPub.includes('version: 8.2.0'), true, 'pubspec.yaml must contain version 8.2.0');

    const updatedGradle = fs.readFileSync(gradlePath, 'utf8');
    assert.strictEqual(updatedGradle.includes('versionName "8.2.0"'), true, 'gradle must contain versionName "8.2.0"');

    const versionJsonPath = path.join(tempDir, '.version.json');
    assert.strictEqual(fs.existsSync(versionJsonPath), true, '.version.json must be generated');
    const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    assert.strictEqual(versionJson.data.latestVersion, '8.2.0');
    assert.strictEqual(versionJson.data.currency, 'BDT');
    assert.strictEqual(versionJson.data.timezone, 'Asia/Dhaka');

    // 3. Test PillarTreeDataProvider
    const treeProvider = PillarTreeDataProvider.getInstance();
    const rootItems = await treeProvider.getChildren();
    assert.strictEqual(rootItems.length, 7, 'Root must contain Health + QuickActions + 5 Pillars');

    const healthItem = rootItems.find(i => i.itemType === PillarTreeItemType.HEALTH_HEADER);
    assert.strictEqual(!!healthItem, true, 'Health header must exist');

    const quickActionsHeader = rootItems.find(i => i.itemType === PillarTreeItemType.QUICK_ACTIONS_HEADER);
    assert.strictEqual(!!quickActionsHeader, true, 'Quick actions header must exist');

    if (quickActionsHeader) {
      const actions = await treeProvider.getChildren(quickActionsHeader);
      assert.strictEqual(actions.length >= 5, true, 'Should have multiple quick action commands');
    }

    const pillarItems = rootItems.filter(i => i.itemType === PillarTreeItemType.PILLAR);
    assert.strictEqual(pillarItems.length, 5, 'Should have exactly 5 pillars');

    const firstPillarModules = await treeProvider.getChildren(pillarItems[0]);
    assert.strictEqual(firstPillarModules.length > 0, true, 'Pillar 1 should contain modules');

    console.log('✔ DevOps & TreeView tests passed successfully.');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
