# ADR-018: Agent Teams Configuration Generator

- **Status:** Accepted
- **Feature:** F10 (Agent Teams Configuration)
- **Task:** 18 — Implement Agent Teams Configuration Generator
- **Date:** 2026-02-18

## Context

Claude Code supports an experimental agent teams mode enabled via the `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` environment flag in `~/.claude/settings.json`. When opted in through the wizard, this feature allows multiple Claude agents to work in parallel on independent tasks. The CLI needs to:

1. Update `~/.claude/settings.json` (a user-level file outside the project root) with the env flag
2. Generate the `.claude/rules/agent-teams.md` rule file within the project

The rule file generation was already implemented in Task 10 as part of `generateRules()` — it conditionally includes `agent-teams.md` when `config.agentTeamsEnabled` is true. What remained was the user-level settings file update and its integration into the post-create phase.

## Decision

- **Separate `configureAgentTeams()` function in `src/generators/agent-teams.ts`** — This function handles only the `~/.claude/settings.json` update. It cannot use the normal `writeFiles()` mechanism because that function scopes all paths relative to the project root, and `~/.claude/settings.json` lives in the user's home directory.

- **Merge-not-replace strategy** — The function reads any existing `~/.claude/settings.json`, parses it, and merges the `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` key without overwriting other settings or env vars. This preserves user customizations.

- **Graceful degradation on missing/corrupted file** — If `~/.claude/settings.json` doesn't exist or contains invalid JSON, the function starts fresh with an empty object. No errors thrown for missing state.

- **Testable via `settingsPath` parameter** — The function accepts an optional `settingsPath` override so tests can write to a temp directory instead of the real home directory. This avoids side effects in the test suite.

- **Integration point: end of `runPostCreate()`** — `configureAgentTeams(config)` is called after all project-root file generation is complete. When `agentTeamsEnabled` is false (the default), the function returns immediately with no side effects.

- **No-op by default** — The default config has `agentTeamsEnabled: false`. The wizard only sets it to true when the user explicitly opts in (via interactive prompt or `SETUP_AI_AGENT_TEAMS=1` env var).

## Consequences

- The agent teams feature remains fully opt-in. Users who never enable it see zero behavioral difference.
- The `~/.claude/settings.json` merge logic is simple (shallow spread). If Claude Code introduces nested env structures in the future, the merge strategy may need updating.
- Tests use real filesystem operations (temp dirs) rather than mocks, consistent with the project's integration-first testing philosophy.
- The two-part approach (rules generator for project-level file, agent-teams generator for user-level file) means the feature spans two modules. This is a natural consequence of the different file scopes but could be confusing for future maintainers — this ADR documents the split.
