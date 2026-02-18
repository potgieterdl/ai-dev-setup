# ADR-031: AI-Powered Project-Aware Configuration (F20)

- **Status:** Accepted
- **Feature:** F20 — AI-Powered Project-Aware Configuration
- **Task:** #32

## Context

The wizard previously asked users to manually specify their project architecture, API paths, database paths, and other structural details. For existing projects, this information is already encoded in the filesystem — package.json dependencies, tsconfig.json, directory structure, Docker/Prisma/GraphQL config files. Asking users to re-state what the code already shows is tedious and error-prone.

Additionally, the wizard used the deprecated `@anthropic-ai/claude-code` npm package for Claude Code installation. The official installation method is now the native installer (`curl -fsSL https://claude.ai/install.sh | bash`), and an authentication gate is needed before any headless Claude operations.

## Decision

Implement a four-step analysis pattern for existing projects: **detect → synthesize → validate → confirm**.

### 1. Deterministic detection (`src/detect.ts`)

A pure filesystem scanner that runs in ~50ms with zero LLM calls. It checks for:

- Configuration files: `package.json`, `tsconfig.json`, `docker-compose.yml`, `.graphqlrc.*`, `prisma/schema.prisma`
- Source directories under `src/` (api, routes, db, models, etc.)
- Framework detection via `package.json` dependencies (Express, Fastify, Next.js, React, etc.)
- ORM detection (Prisma, Drizzle, TypeORM, Sequelize, Mongoose)
- Test framework detection (Vitest, Jest, Mocha, Playwright, Cypress)

Returns a structured `DetectionResult` — no opinions, just facts.

### 2. LLM synthesis (`src/analyze.ts`)

Passes the `DetectionResult` to Claude Haiku in headless mode (`claude --model haiku -p ... --output-format json --json-schema ...`) to produce a `ProjectAnalysis`:

- `detectedArchitecture`: monolith | 2-tier | 3-tier | microservices
- `apiPaths`, `dbPaths`, `testPaths`: glob patterns for path-scoped rules
- `architectureGuidance`: 1-2 sentence summary for CLAUDE.md
- `recommendedRules`: which rule templates to activate
- `hookSteps`: which quality gate steps are relevant

### 3. Zod validation (`src/analyze.ts`)

The Haiku response is validated against a Zod schema (`AnalysisSchema`) before being used. On validation failure, the call is retried once. On second failure, the analysis gracefully returns `null` and the wizard falls back to manual prompts.

A matching JSON Schema is passed to Claude via `--json-schema` for constrained decoding, keeping the Zod schema and JSON Schema in sync.

### 4. User confirmation (`src/wizard.ts`)

The analysis results are previewed to the user who can accept (skipping manual architecture/API/database prompts) or reject (falling back to manual entry).

### Supporting changes

- **Native Claude installer**: `installClaudeCode()` in `src/audit.ts` and `src/phases/on-create.ts` now use `curl -fsSL https://claude.ai/install.sh | bash` instead of the deprecated npm package.
- **Authentication gate**: New `checkClaudeAuthenticated()` function and `stepAuthGate()` wizard step verify Claude is authenticated before attempting headless operations.
- **Dynamic path scoping**: `templates/rules/api.md` and `templates/rules/database.md` now use `{{API_PATHS}}` and `{{DB_PATHS}}` placeholders, filled from analysis results (with sensible fallback defaults).
- **Architecture guidance in CLAUDE.md**: When analysis provides `architectureGuidance`, it's injected as an `## Architecture Notes` section.

### Type additions

- `DetectionResult` interface — filesystem signals
- `ProjectAnalysis` interface — LLM output shape
- `KNOWN_RULES` and `KNOWN_HOOK_STEPS` const arrays with branded types
- `isExistingProject`, `claudeAuthenticated`, `analysisResult?` fields on `ProjectConfig`

## Consequences

- **Positive:** Existing projects get intelligent defaults with minimal user input. Path-scoped rules use actual project paths instead of generic guesses.
- **Positive:** Graceful degradation at every step — no Claude? Skip analysis. Auth fails? Skip analysis. Haiku fails? Retry once, then fall back to manual. User rejects? Manual entry.
- **Positive:** Detection is fast and deterministic — the expensive LLM call only happens when detection finds something worth analyzing.
- **Negative:** Adds `zod` as a runtime dependency (~52KB minified).
- **Negative:** The Zod schema and JSON Schema must be kept in sync manually.
