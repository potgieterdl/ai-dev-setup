# ADR-013: Lifecycle Phases Implementation

- **Status:** Accepted
- **Feature:** F1 (TypeScript CLI), F6 (Guided Project Kickstart)
- **Task:** 13 — Implement Lifecycle Phases (on-create, post-create, post-start)
- **Date:** 2026-02-17

## Context

The CLI needs to support three Codespace lifecycle events that map to devcontainer.json hooks:

1. `onCreateCommand` — heavy installs, runs once per Codespace creation
2. `postCreateCommand` — project configuration, generates all files
3. `postStartCommand` — per-session setup, runs on every Codespace start

Each phase has different responsibilities and execution frequency. The devcontainer generator (ADR-011) already emits lifecycle commands referencing `ai-init on-create`, `ai-init post-create`, and `ai-init post-start`.

Key design questions:

- How should phases interact with generators?
- Should post-create return information for the audit step (F11)?
- How should post-start read task progress from different trackers?

## Decision

- **Three separate modules** — `src/phases/on-create.ts`, `src/phases/post-create.ts`, `src/phases/post-start.ts`, each exporting a single async function. A barrel export (`src/phases/index.ts`) re-exports all three for clean imports.

- **on-create is config-free** — `runOnCreate()` takes no arguments. It uses `commandExists()` to check for tools and `run()` to install them. This keeps it simple and idempotent — safe to call repeatedly.

- **post-create orchestrates generators** — `runPostCreate(config, overwrite?)` collects FileDescriptor[] from all generators (MCP, CLAUDE.md, devcontainer are always-on; docs, rules, skills, hooks, commands are conditional on config flags), then calls `writeFiles()` once. Returns the list of written paths and appends them to `config.generatedFiles` for the audit step (F11).

- **post-start handles session setup** — `runPostStart(config)` does three things: (1) syncs API keys from environment to `.env` without overwriting existing keys, (2) reads task progress from the chosen tracker (Task Master JSON or markdown table), and (3) prints a welcome banner with task counts.

- **CLI routing via switch statement** — `cli.ts` routes subcommands (`on-create`, `post-create`, `post-start`) to the corresponding phase function. Default (no command) will eventually invoke the interactive wizard (F6/F14). The CLI uses `defaultConfig(cwd)` until the wizard populates config from user choices.

- **Env sync is additive** — `syncEnvFile()` only appends missing keys. If a key already exists in `.env`, it is never overwritten. This prevents clobbering user-customized values.

- **Task counting is tracker-specific** — Task Master uses JSON parsing of `.taskmaster/tasks/tasks.json`. Simple markdown uses regex matching on table rows (`[x]` vs `[ ]`). Beads has no local file to read, so its banner shows no task counts.

## Consequences

- Phase functions are independently testable: `runOnCreate` can be tested by mocking `commandExists` and `run`; `runPostCreate` can be tested in a temp directory by verifying generated files exist; `runPostStart` can be tested by providing fixture task files and capturing console output.
- The `generatedFiles` tracking in post-create creates a side effect on the config object. This is intentional — the audit step (F11) needs the complete manifest of what was generated. Alternative approaches (returning a separate manifest) were rejected as they'd complicate the orchestration flow.
- The welcome banner format is deliberately simple (box-drawing characters, no colors). This ensures it renders correctly in all terminals including headless/CI environments.
- Adding a new tracker type requires: (1) a new case in `post-start.ts` task counting, (2) updating `commands.ts` tracker mappings (already documented in ADR-012), and (3) updating `claude-md.ts` tracker instructions (ADR-008).
