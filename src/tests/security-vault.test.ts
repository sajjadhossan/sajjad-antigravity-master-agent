import * as assert from 'assert';
import { SecurityVault } from '../core/security-vault';

export function runSecurityVaultTests() {
  console.log('Running SecurityVault Tests...');
  const vault = SecurityVault.getInstance();

  // Test 1: Secret Masking with dynamic test string
  const fakeGhToken = ['ghp_', 'mockSecretToken1234567890abcdefghijkl'].join('');
  const fakeSkKey = ['sk-', 'mockSecretKey1234567890abcdef1234567890'].join('');
  const rawLog = `Connecting with ${fakeSkKey} and ${fakeGhToken}`;
  const masked = vault.maskSecrets(rawLog);

  assert.ok(!masked.includes(fakeSkKey), 'Key should be redacted');
  assert.ok(!masked.includes(fakeGhToken), 'Token should be redacted');
  assert.ok(masked.includes('REDACTED'), 'Masked output should have REDACTED note');

  console.log('✔ SecurityVault secret masking test passed.');
}
