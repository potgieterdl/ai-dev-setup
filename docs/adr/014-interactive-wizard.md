# ADR-014: Interactive Wizard Implementation

- **Status:** Accepted
- **Feature:** F6 (Guided Project Kickstart)
- **Task:** 14 — Implement Interactive Wizard
- **Date:** 2026-02-17

## Context

The CLI needs an interactive 10-step wizard that walks users through project setup. The wizard must also support a fully non-interactive mode driven by environment variables for CI/automation and Codespace lifecycle use. Key design questions:

- How should the wizard be structured for testability?
- How should interactive vs non-interactive mode be handled?
- How should the wizard integrate with the existing CLI entry point and lifecycle phases?
- How should the wizard handle Claude Code availability for the audit step?

## Decision

- **Single module with step functions** — `src/wizard.ts` exports `runWizard(projectRoot)` which returns a `ProjectConfig`. Internally, each of the 10 steps is a separate async function (`stepMcpSelection`, `stepTaskTracker`, etc.) that reads from the `config` object and mutates it. This keeps each step independently readable and makes it straightforward to add/remove steps.

- **Non-interactive mode via env var check** — A single `isNonInteractive()` helper checks `SETUP_AI_NONINTERACTIVE === "1"`. Each step function checks this at the top and reads from environment variables instead of prompting. This avoids passing a mode flag through every function and keeps the env var as the single source of truth.

- **Environment variable mapping** — The wizard reads: `SETUP_AI_MCPS` (comma-separated), `SETUP_AI_TRACKER`, `SETUP_AI_ARCH`, `SETUP_AI_AGENT_TEAMS`, `SETUP_AI_SKIP_AUDIT`, and `SETUP_AI_PRD_PATH`. Unset vars fall back to defaults from `defaultConfig()`. This matches the env var names already documented in the PRD.

- **Derived config values in non-interactive mode** — `hasApiDocs` and `hasDatabase` are derived from `architecture` in non-interactive mode (e.g., `3-tier` implies `hasDatabase=true`). In interactive mode, the user is prompted explicitly. This provides sensible defaults without requiring additional env vars.

- **CLI integration via wizard-first flow** — The default command (no args) and `--non-interactive` both run the wizard then pass the resulting config to `runPostCreate()`. The `post-create` and `post-start` lifecycle commands also run the wizard to collect config. The `defaultConfig()` import was removed from `cli.ts` — the wizard now owns config creation.

- **Claude Code bootstrap is a check, not an install** — Step 0 checks `commandExists("claude")` and returns a boolean. If Claude is unavailable, the audit step (Step 9) is automatically skipped. Installation of Claude Code is handled by the `on-create` phase, not the wizard.

- **Tracker-MCP auto-inclusion** — When the user selects `taskmaster` as tracker, the wizard ensures the `taskmaster` MCP is in `selectedMcps`. Same for `beads`. This prevents a misconfiguration where the tracker's MCP isn't registered.

- **Tests focus on non-interactive mode** — Since `@inquirer/prompts` requires terminal interaction, tests exercise the non-interactive code path by setting `SETUP_AI_NONINTERACTIVE=1` and verifying config output for various env var combinations. A `withEnv()` helper saves/restores env to prevent test pollution.

## Consequences

- The wizard is testable without mocking `@inquirer/prompts` — non-interactive tests cover all config derivation logic.
- Adding a new wizard step requires: (1) a new step function, (2) calling it from `runWizard()`, (3) optionally adding an env var for non-interactive support.
- The `post-create` and `post-start` CLI commands now invoke the wizard, meaning they respect env var overrides. This is intentional — it allows lifecycle phases to be configured per-environment.
- Interactive mode is not unit-tested in this implementation. Integration tests with `@inquirer/testing` can be added in a future task if needed.
