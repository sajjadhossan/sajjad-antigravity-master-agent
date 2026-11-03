# Antigravity Rules Engine Specification

## Hierarchy
1. **Global Rules**: Pre-packaged in `resources/rules/global-rules.json`. Universal across all workspaces.
2. **Project Rules**: `.project-rules.json` located at the root of the active workspace.
3. **Template Presets**: Domain-specific templates for Retail POS, Samity, Dairy Agro, Diagnostic Centers, CRMs, and Utilities.

## Rule Schema
```json
{
  "id": "RULE-CUSTOM-01",
  "name": "Human-readable Name",
  "category": "Financial | Security | Architecture | ZeroDemo | CrossPlatform",
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "description": "Explanation of the rule's purpose.",
  "pattern": "Regular expression or syntax token",
  "recommendation": "Concrete steps to resolve violations"
}
```

## Zero-Demo Enforcement
Any pattern matching mock returns (`return null; // temporary`, `return [/* fake sample */];`) in production code is intercepted and marked as a **CRITICAL** release blocker.
