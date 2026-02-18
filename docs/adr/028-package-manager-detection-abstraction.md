# ADR-028: Package Manager Detection & Abstraction (F15)

## Status

Accepted

## Context

The ai-init CLI previously hardcoded `npm` commands throughout all generators, templates, and scaffolded output. Projects using pnpm, yarn, or bun received npm-specific instructions that were incorrect for their setup (e.g., `npm run lint` instead of `pnpm lint`, `npx` instead of `pnpm dlx`).

Feature F15 of the PRD requires automatic detection of the project's package manager and abstraction of all PM-specific commands behind a `PackageManager` interface.

## Decision

### 1. PackageManager Interface

A `PackageManager` interface was added to `src/types.ts` with fields: `name`, `install`, `installGlobal`, `run`, `exec`, `lockFile`, `runIfPresent`, and `test`. The `ProjectConfig` type gained a `pm: PackageManager` field.

### 2. Detection Strategy (src/pm.ts)

Detection follows a strict priority order:
1. **Lock file** — presence of `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, or `bun.lockb`
2. **`packageManager` field** in `package.json` — parsed to extract the PM name
3. **Fallback** — defaults to npm if no signal is found

Lock files take priority because they are the most reliable indicator of which PM is actually managing dependencies.

### 3. CLI Override

A `--pm` flag (and `SETUP_AI_PM` env var) allows explicit override of the detected PM, useful in CI or when the project has no lock file yet.

### 4. Template Placeholders

All templates use `{{PM_*}}` placeholders (e.g., `{{PM_RUN}}`, `{{PM_TEST}}`, `{{PM_INSTALL}}`), which are resolved by `fillTemplate()` at generation time using the detected PM's command strings.

### 5. Global Installs Stay npm

Global tool installs (Claude Code, Task Master) in `on-create.ts` remain `npm install -g` regardless of the project's detected PM. Rationale: these are system-wide developer tools, not project dependencies. npm is universally available as it ships with Node.js, and global install semantics vary significantly across PMs (yarn global is deprecated in v4, bun global support is limited).

### 6. MCP exec Command

The MCP JSON generators now use `config.pm.exec` (e.g., `npx`, `pnpm dlx`, `yarn dlx`, `bunx`) for the `command` field. The `-y` flag is only added for npx (where it suppresses the install prompt); other PMs don't need it.

## Consequences

- All generated output (CLAUDE.md quality gate, pre-commit hooks, onboarding docs, testing strategy, rules, skills, MCP configs) correctly reflects the project's PM.
- New PMs can be added by extending the `PACKAGE_MANAGERS` map in `src/pm.ts`.
- Existing tests were updated; new PM-specific tests were added for hooks, CLAUDE.md, and detection logic.
