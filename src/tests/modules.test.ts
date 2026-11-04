import * as assert from 'assert';
import { createAllModules } from '../modules';
import { ModuleRegistry } from '../core/module-registry';

export function runModulesTests() {
  console.log('Running Modules Registry & 50-in-1 Tests...');
  const modules = createAllModules();

  assert.strictEqual(modules.length, 50, 'Exactly 50 modules must be instantiated');

  // Verify sequence 1 to 50
  for (let i = 1; i <= 50; i++) {
    const mod = modules.find(m => m.number === i);
    assert.ok(mod, `Module #${i} must exist`);
    assert.ok(mod.name && mod.name.length > 5, `Module #${i} must have a descriptive name`);
    assert.ok(mod.category, `Module #${i} must have a category`);
  }

  // Registry singleton verification
  const registry = ModuleRegistry.getInstance();
  assert.strictEqual(registry.getAllModules().length, 50, 'Registry must load all 50 modules');

  // Test Module 1 (Auto Accept)
  const mod1 = registry.getModule(1);
  assert.ok(mod1, 'Module 1 must exist');

  // Test Module 4 (Android Preflight)
  const mod4 = registry.getModule(4);
  assert.ok(mod4, 'Module 4 must exist');

  // Test Module 9 (Project Memory)
  const mod9 = registry.getModule(9);
  assert.ok(mod9, 'Module 9 must exist');

  // Test Module 25 (Code Coverage)
  const mod25 = registry.getModule(25);
  assert.ok(mod25, 'Module 25 must exist');

  console.log('✔ All 50 modules verified successfully.');
}
