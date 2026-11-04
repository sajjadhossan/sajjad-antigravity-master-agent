# Changelog

All notable changes to the "Antigravity Master Agent, Rules Engine & Multi-Platform APK Guard" extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.1.0] - 2026-11-04

### Added
- **Multi-Platform Release Version Automation**:
  - Automated release tagging and synchronization across `package.json`, `package-lock.json`, `pubspec.yaml`, Android Gradle, Tauri, and `.version.json`.
- **Financial Ledger & Currency Precision Guard (`FinancialLedgerGuardService`)**:
  - Automated detection of floating-point arithmetic on currency values (`amount Float`, `parseFloat(amount)`, Dart `double`).
  - Mandatory `tenant_id` filter auditor for financial and ledger database queries (Section 4 Rule 6).
- **80mm Thermal Receipt Simulator & HMAC Invoice QR**:
  - ESC/POS standard thermal receipt generation with bilingual Bengali/English branding, line items table, and cryptographic HMAC-SHA256 digital verification QR.
- **Enterprise Immutable Audit Trail Service (`AuditTrailService`)**:
  - Cryptographic tamper-evident audit logging at `.antigravity/audit/audit-trail.jsonl` with full markdown viewer command (`antigravityMaster.viewAuditTrail`).
- **Real-Time Error & Incident Webhook Dispatcher (`WebhookDispatcherService`)**:
  - Redacted live event dispatcher for Slack, Discord, Telegram, and REST endpoints (Module 10 & 35).
- **Consolidated Executive Status Bar Quick Menu**:
  - High-visibility `$(shield) Sajjad Guard: 100% PASS` with 1-click executive QuickPick launcher.

## [8.0.0] - 2026-11-04

### Added
- **Native 5-Pillar Activity Bar Sidebar Tree View (`PillarTreeDataProvider`)**:
  - Direct glanceable view of the 5 Enterprise Pillars right in the VS Code sidebar.
  - Live compliance status icons (`pass-filled`, `warning`, `error`, `clock`) for each of the 50 modules.
  - Embedded Quick Actions menu for 1-click sweeps, auto-heal, secret scanning, and workflow generation.
- **Modernized Executive 4-Tab Webview Command Center**:
  - Re-architected 9 cramped tabs into 4 clean, responsive tabs:
    - `📊 Overview & Health`: SVG circular health meter (0–100%), 5-Pillar radar, quick stats, and auto-heal.
    - `🛡️ Guard 1–50`: Accordion-based collapsible pillars grouping all 50 enterprise modules.
    - `🚀 DevOps & Lab`: Real-time backup/restore runner, dependency auditor, secret scanner, and APK signing inspector.
    - `📜 Rules & AI`: Dynamic rules engine, industry templates, and `.project-memory.json` bank.
- **1-Click Auto-Heal Engine (`antigravityMaster.autoHeal`)**:
  - Automatically initializes `.project-memory.json`, `.project-rules.json`, fixes missing `.gitignore` security rules, generates enterprise workflows, and triggers an instant full-compliance sweep.
- **Lightbulb Quick-Fix CodeAction Provider (`Ctrl+.`)**:
  - One-click auto-fixes for unpinned dependencies, missing `.gitignore` secrets patterns, missing `.project-memory.json`, empty button handlers, and missing `tenant_id` database queries.
- **Enterprise CodeLens Provider**:
  - Real-time clickable status badges directly atop TypeScript, JavaScript, Dart, JSON, and ignore files.
- **Cross-Platform Schema & DTO Parity Guard Service (`ParityGuardService`)**:
  - Real schema parsing and cross-language contract validation for Prisma (`schema.prisma`), SQL DDL (`CREATE TABLE`), Dart models (`class`), and TypeScript interfaces (`interface`).
- **Real Zero-Demo Backup & Recovery Engine (`BackupRecoveryService`)**:
  - GZIP compression, SHA-256 checksum generation, local and cloud directory verification, and simulated restore verification.
- **Comprehensive Workspace Dependency & Secret Auditor**:
  - AST and lockfile analysis checking for unpinned wildcard dependencies, insecure protocols (`http://`, `git://`), and regex scans for hardcoded API keys, JWT secrets, and connection strings.
- **Enterprise CI/CD Workflow Generator (`WorkflowGeneratorService`)**:
  - Produces 5 production-grade GitHub Actions pipelines:
    - `android-release.yml`: Automated APK build, signing key decode, artifact upload (`app-v{ver}-build{num}-android.apk`), and GitHub release publishing.
    - `web-vercel-deploy.yml`: Vercel production deployment with pre-flight lint, typecheck, tests, and Prisma schema validation.
    - `desktop-build.yml`: Windows PC (x64) and macOS (Intel x86_64 & Apple Silicon arm64) desktop packaging.
    - `dispatch-build.yml`: Manual on-demand build dispatcher for Web, Android, Windows, and macOS.
    - `enterprise-ci.yml`: Continuous integration compliance runner testing all 50 modules on PR/push.
- **Multi-Platform Semantic Version Synchronizer**:
  - Atomic synchronization across `package.json`, `package-lock.json`, Flutter `pubspec.yaml`, Android `build.gradle` (Groovy & Kotlin DSL), Tauri `tauri.conf.json`, and central `.version.json`.
- **Zero-Demo Compliance Enforcement**:
  - Resolved all false-positive warnings and configuration gating across Module 1 (Auto-Accept), Module 4 (Android Preflight), Module 9 (Project Memory), Module 25 (Coverage), Module 27 (Backup), Module 32 (DTO Parity), and Module 41 (OWASP Scanner).
- **Full 7-Suite Automated Test Harness**:
  - 100% automated test coverage across SecurityVault, Module Registry, ReleaseGate, Backup & Dependency Scanner, Editor Providers, Parity Guard, and DevOps/TreeView.
