# Contributing to Antigravity Master Agent

Thank you for contributing to Antigravity Master Agent!

## Development Setup

1. Clone repository:
   ```bash
   git clone https://github.com/antigravity-technologies/antigravity-master-agent.git
   cd antigravity-master-agent
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run compiler in watch mode:
   ```bash
   npm run watch
   ```
4. Press `F5` in VS Code / Antigravity IDE to launch the Extension Development Host.

## Code Standards

- TypeScript strict mode is enabled.
- All 50 modules must adhere to `IModuleDefinition` and return accurate statuses:
  - `WORKING`, `WAITING`, `ERROR`, or `DISABLED`.
- Never commit secrets or hardcoded test keys.
- Write unit tests for new services under `src/tests/`.
- Ensure all CI checks pass (`npm run typecheck`, `npm run lint`, `npm test`).
