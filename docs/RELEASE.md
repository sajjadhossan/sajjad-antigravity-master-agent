# Antigravity Release Automation & CI/CD Guide

## Automated Workflow Pipeline

1. **Local Pre-Flight**:
   Run `Antigravity: Force-Verify 1–50 & Prepare Release Gate` (`antigravityMaster.forceVerifyAndPrepareRelease`).
   All 50 modules are scanned. If any Critical Blocker is found, release is locked.

2. **Semantic Version Bumping**:
   Execute `Antigravity: Bump Version Across Multi-Platforms` (`antigravityMaster.bumpVersion`).
   Synchronizes `package.json`, `pubspec.yaml`, `build.gradle`, and `AndroidManifest.xml`.

3. **Tag Push & GitHub Actions**:
   ```bash
   git tag v8.0.0
   git push origin v8.0.0
   ```

4. **GitHub Release Output**:
   The `release.yml` workflow:
   - Sets up Node 22
   - Runs typecheck and linting
   - Packages `.vsix`
   - Computes SHA256 checksum
   - Creates GitHub Release and attaches `antigravity-master-agent-8.0.0.vsix` and `.sha256`
