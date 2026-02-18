# ADR-030: `ai-init doctor` Health Check & Validation Command (F17)

- **Status:** Accepted
- **Feature:** F17 — Doctor Health Check
- **Task:** #29

## Context

After initial setup (and especially after manual edits), AI dev environment configurations can drift: MCP servers reference missing API keys, rules import docs that were deleted, hooks reference scripts that aren't executable, or CLAUDE.md references a task tracker that was never configured. There was no way to detect these issues except by hitting them at runtime.

The project needed a validation command that could systematically audit the AI dev environment health and surface misconfigurations before they waste agent or developer time.

## Decision

Implement an `ai-init doctor` subcommand that runs 7 categorized health checks in parallel:

1. **MCP Configuration** — Validates `.mcp.json` and `.vscode/mcp.json` are valid JSON, checks configured servers exist in the registry, and verifies required API keys are set in the environment.
2. **Agent Instructions** — Confirms `CLAUDE.md` and `CLAUDE_MCP.md` exist, warns if they exceed 200 lines, and resolves all `@import` cross-references.
3. **Rules & Skills** — Enumerates `.claude/rules/` and `.claude/skills/`, checks `@import` references within rule files resolve to existing docs.
4. **Hooks** — Verifies hook scripts exist and are executable (`chmod +x`), validates `.claude/settings.json` is valid JSON with hook matchers.
5. **Task Tracker** — Detects which tracker is configured (Task Master, Beads, or Simple Markdown) and validates its data files.
6. **Documentation** — Checks `docs/` directory exists and scans for unfilled `{{PLACEHOLDER}}` markers.
7. **Dependencies** — Verifies required CLI tools (`claude`, `task-master`, `npx`) are on PATH.

### Architecture choices

- **`src/doctor.ts` is independent of `ProjectConfig`** — It inspects the filesystem directly, making it usable without having run the wizard first. This is intentional: `doctor` should work on any project, even one configured manually.
- **All checks run with `Promise.all`** — Categories execute in parallel for speed.
- **`runDoctor()` / `printDoctorReport()` split** — Separates data collection from presentation. `runDoctor()` returns structured `HealthCheck[]` results; `printDoctorReport()` renders them with ANSI colours and returns an exit code. This allows CI scripts to capture structured results.
- **Colour output respects `NO_COLOR`** — Follows the `NO_COLOR` convention and degrades gracefully for non-TTY streams.
- **Exit code semantics** — `0` for all pass (warnings OK), `1` for errors. Warnings don't fail CI.

### New types added to `src/types.ts`

- `CheckResult` — `{ status: 'pass' | 'warn' | 'error', message: string }`
- `HealthCheck` — `{ category: string, results: CheckResult[] }`

### New helpers added to `src/utils.ts`

- `fileExists(path)` — Async check if file exists
- `isExecutable(path)` — Async check if file has execute permission
- `isValidJson(content)` — Sync JSON parse validation

### New helper added to `src/registry.ts`

- `getRequiredEnvVars(serverName)` — Derives required env var names from `${VAR}` patterns in server env config

## Consequences

- Users can validate their setup with a single command: `ai-init doctor`
- CI pipelines can include `ai-init doctor` as a validation step
- Complements `ai-init update` — doctor finds problems, update fixes them
- New team members can verify their environment is correctly configured
- The command works on manually-configured projects, not just wizard-generated ones
