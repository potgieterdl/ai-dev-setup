# ADR-008: CLAUDE.md and CLAUDE_MCP.md Generator

- **Status:** Accepted
- **Feature:** F3 (Rules, Skills & Hooks Generation), F4 (MCP Server Configuration)
- **Task:** 8 — Implement CLAUDE.md Generator
- **Date:** 2026-02-17

## Context

Claude Code loads `CLAUDE.md` as its primary instruction file on session start. The content must be tailored to the user's project: which task tracker they chose, which MCP servers they selected, whether docs and rules were generated, and what quality gate they follow. A separate `CLAUDE_MCP.md` file provides per-server tool documentation. These files must accurately reflect the actual project configuration — agents rely on them to know which commands to use and where to find project context.

Three task trackers produce substantially different instruction sets:

- **Task Master:** imports `.taskmaster/CLAUDE.md`, references `task-master` CLI commands
- **Beads:** references beads MCP tools (`beads_ready`, `beads_create`, etc.) and `bd` CLI
- **Simple Markdown:** references `TASKS.md` with checkbox-based tracking

## Decision

- **Pure synchronous function** — `generateClaudeMd(config: ProjectConfig): FileDescriptor[]` follows the same generator contract as `generateMcpJson()`. Synchronous because it builds content from config values only (no template file reads needed).
- **Section-based composition** — The CLAUDE.md content is built from discrete sections (doc imports, tracker instructions, MCP references, rules reference, quality gate). Each section is produced by a dedicated internal helper function. Sections are conditionally included based on `ProjectConfig` flags (`generateDocs`, `generateRules`, `selectedMcps`).
- **`@import` syntax for doc references** — When `generateDocs` is true, CLAUDE.md includes `@docs/prd.md`, `@docs/architecture.md`, etc. This uses Claude Code's native auto-import mechanism so agents automatically have project context loaded.
- **Conditional CLAUDE_MCP.md** — Only generated when `selectedMcps` is non-empty. Contains per-server documentation with package names. Referenced from CLAUDE.md via `@CLAUDE_MCP.md`.
- **Quality gate always included** — The 5-step quality gate (format → lint → typecheck → build → test) is present in every generated CLAUDE.md regardless of configuration. This ensures agents always know the verification steps.
- **Tracker instructions are exhaustive** — Each tracker case includes the actual commands agents need (not just "use the tracker"). This prevents agents from guessing at syntax.

## Consequences

- CLAUDE.md content stays in sync with actual project configuration — if a user skips docs generation, no `@docs/` references appear.
- Adding a new task tracker option requires adding a new case to `buildTaskTrackerInstructions()`. The switch statement is exhaustive (TypeScript enforces this for the `TaskTracker` union type).
- The generator doesn't read or depend on template files, keeping it simple and fast. The trade-off is that CLAUDE.md structure is encoded in code rather than in an editable template — acceptable since this file's structure is tightly coupled to the config options.
- CLAUDE_MCP.md uses server metadata from the registry, so adding a new MCP server automatically includes it in the MCP docs file.
