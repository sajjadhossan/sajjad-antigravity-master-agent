# Enterprise Security & Compliance Guard

## 1. Secret Protection & Masking
Antigravity Master Agent actively redacts credentials in memory before passing them to logs, diagnostics, or webviews:
- GitHub Tokens: `ghp_[0-9a-zA-Z]{36}`
- Google Cloud / Firebase API Keys: `AIza[0-9A-Za-z-_]{35}`
- Private Keys: `-----BEGIN (RSA|EC|OPENSSH|DSA|PGP)? PRIVATE KEY-----`
- Generic Sk-keys: `sk-[a-zA-Z0-9]{32,}`

## 2. Destructive Command Shield
The extension monitors all proposed terminal operations and blocks:
- `rm -rf /` or `rm -rf *`
- `mkfs`, `format`
- `DROP DATABASE`, `DROP TABLE`
- `git push --force` or `-f` to `main`, `master`, or `production`
- Deleting keystore or signing properties files

Any command classified as destructive requires explicit interactive user confirmation and an audit log entry.

## 3. SecretStorage Integration
Sensitive user inputs (such as custom GitHub tokens or AI keys) are stored strictly inside the OS-backed VS Code `SecretStorage` vault, never in workspace settings or plaintext JSON files.
