# Antigravity Master Agent — 50 Modules Specification

| # | Module Name | Primary Responsibility | Critical Release Blocker |
|---|---|---|---|
| 1 | Zero-Click Auto-Accept Engine & Smart Agent Control | Safe automated command approval, command allowlist/denylist, max 3 retries | No (Configurable) |
| 2 | Real-Time Code Guard, Formatter & Deep UI Scanner | Format on save, empty callbacks detection (`onPressed: () {}`), syntax check | Yes (If empty callbacks in prod) |
| 3 | Post-Coding Force-Fix Lock & Self-Healing AI Loop | Read diagnostics, generate precise fix prompts, block dirty deliveries | Yes (When errors exist in problems) |
| 4 | Android APK Pre-Flight Inspector & Signing Manager | Permission discovery, `.gitignore` coverage, ProGuard rules, signing key validation | Yes (Missing key/permissions) |
| 5 | Smart GitHub Actions CI/CD & QR Delivery | Workflow generation, failure log sanitization, QR code artifact generator | Yes (Missing workflow on release) |
| 6 | Backend API, Database Schema & Security Validator | REST/Supabase ping, local model vs schema comparison, RLS policy audit | Yes (Schema drift or broken RLS) |
| 7 | Automated UI Bot & Bangla Font Guard | Headless route check, RenderFlex overflow risk analysis, Bengali font audit | Yes (Broken navigation route) |
| 8 | APK Size Diet & Multi-Platform Release Builder | Dead asset scanner, size estimation, multi-platform artifact builder | No (Warning only) |
| 9 | AI Project Memory Bank & API Failover Manager | Workspace memory (`.project-memory.json`), duplicate logic detection | No |
| 10 | In-App OTA Auto-Updater & Live Crash Bridge | GitHub release checker injection, runtime crash queue | No |
| 11 | 4-Device Cross-Platform Sync Verifier | Platform-breaking import audit (`dart:io` on Web), conflict resolution | Yes (Platform-breaking imports) |
| 12 | Multi-Tier Automated Backup & Restore Validator | Cloud/local backup verification, mock restore simulation, schema recovery | Yes (If backup enabled and fails) |
| 13 | Auth Session Persistence & Role-Based Security Guard | Token persistence, plain localStorage warning, RBAC permission filters | Yes (Plaintext sensitive tokens) |
| 14 | Cross-Platform Hardware Bridge Validator | Thermal printer ESC/POS, barcode/QR scanner fallback, camera readiness | No (Warning if missing fallbacks) |
| 15 | Dynamic Custom Rules Engine | Global & project rules (`.project-rules.json`), industry templates (POS, Samity) | Yes (On CRITICAL rule violation) |
| 16 | Financial & Accounting Ledger Auditor | Detection of raw float currency math, double-entry validation | Yes (Float currency calculation) |
| 17 | Official Branding & Invoice/QR Validator | Invoice header, footer, tax, signature block, verification QR scannability | Yes (Broken invoice QR) |
| 18 | Cross-Software Reusable Feature Vault | Packaged tested features (Auth, Backup, Thermal Printing, QR Attendance) | No |
| 19 | Real-Time Resource & Memory Leak Guard | Unclosed streams, controllers, timers, event subscriptions | Yes (Unclosed controllers/streams) |
| 20 | AI Prompt Token & Cost Optimizer | Context pruner, boilerplate remover, token counter | No |
| 21 | Local Database Security & Vault Guard | Plaintext SQLite/Hive/Prefs audit, AES-256 secure storage enforcement | Yes (Plaintext credentials in DB) |
| 22 | Multi-Language & Localization Validator | Hardcoded string detection, Bengali & English key sync audit | No (Warning on untranslated keys) |
| 23 | Multi-Branch & Multi-Tenant Data Isolation Guard | Missing `tenant_id` query filter detector, cross-tenant leak guard | Yes (Missing tenant filter) |
| 24 | Automated API Mock & Stress Tester | Offline fallback mock generator, latency and failure simulation | No |
| 25 | Live Code Coverage & Unit Test Validator | Test runner, coverage parser, untested critical business logic detector | Yes (If coverage < threshold) |
| 26 | Hardware & Peripheral Bridge Status Monitor | Bluetooth/USB thermal printer, barcode scanner, webcam status monitor | No |
| 27 | Cloud Backup Schedule & Health Monitor | Scheduled backup retention, checksum, encryption, restore health | Yes (If backup expired/failed) |
| 28 | One-Click Production Release Distributor | Distribution packaging, checksum generator, beta release publisher | No |
| 29 | AI Interactive Planning Engine | Intent analyzer, schema/API/UI breakdown, explicit approval gate | Yes (Executing unapproved plan) |
| 30 | Speed & Token Cost Optimizer | Incremental file diff feeder, cache manager, token reduction metrics | No |
| 31 | Anti-Fake & Zero-Boilerplate Enforcer | Block mock return placeholders, enforce actual validation logic | Yes (Demo / fake mock return) |
| 32 | Full-Stack API & DTO Contract Validator | Frontend payload keys vs backend DTO field validator, type mismatch detector | Yes (DTO key/type mismatch) |
| 33 | Unique, Modern & Non-Generic UI Design System | Token validator for typography, spacing, radius, colors, dark/light themes | No (Warning on design drift) |
| 34 | Intent Confirmation & Zero-Demo Engine | Pre-coding goal confirmation dialog, production integrity check | Yes (Attempting unconfirmed code) |
| 35 | Real-Time Live Error & Crash Webhook Bridge | Redacted crash dispatcher to Telegram, WhatsApp, Slack, Discord | No |
| 36 | Database Migration & Schema Compatibility Guard | Destructive migration detector (`DROP COLUMN`, `DROP TABLE`), backup check | Yes (Unsafe migration without backup) |
| 37 | Automated Code Refactoring & Dead Code Purger | Unused function, component, import detector with safe diff previews | No |
| 38 | API Rate Limit & Security Firewall Shield | Missing rate limiting, CORS wildcard, missing Helmet headers detector | Yes (Missing CORS/Rate-limit in prod) |
| 39 | RBAC & Audit Trail Validator | Verify audit logging on create/update/delete operations | Yes (Missing audit row on financial entity) |
| 40 | Voice-to-Code & Multi-Language Natural Bridge | Bengali/English speech & text prompt converter into technical specs | No |
| 41 | OWASP & Dependency Vulnerability Security Scanner | Scans `package-lock.json`, `pubspec.lock` for known critical CVEs | Yes (High/Critical CVEs) |
| 42 | Screen Responsive & Theme Inspector | Fixed width/pixel overflow detector, theme token coverage checker | No (Warning on overflow risk) |
| 43 | Dynamic QR Code Testing & Payload Verifier | Validates QR JSON payload, size, contrast, quiet zone, and decoding | Yes (Malformed QR payload) |
| 44 | Intelligent Release Notes Generator | Analyzes Git commits and PRs to build bilingual EN/BN release changelog | No |
| 45 | Smart Rollback & Incident Recovery Center | Rollback history tracker, database migration state checker | No |
| 46 | AI Code Reviewer & Pull Request Guardian | Pre-commit diff scanner for race conditions, N+1 queries, unhandled errors | Yes (Critical review issues) |
| 47 | Environment, Config & Secret Drift Detector | Compares `.env.example` vs `.env`, detects leaked Git history secrets | Yes (Leaked secret in git history) |
| 48 | Business Workflow Simulator & Edge-Case Generator | Simulates POS sales, loan repayments, and diagnostic billings under stress | No |
| 49 | Accessibility & UX Quality Guard | Touch target size, contrast ratio, missing aria/alt labels detector | No (Warning on low contrast) |
| 50 | Extension Health, Telemetry & Self-Diagnostic Center | Monitors extension runtime, file watchers, exports redacted diagnostics | No |
