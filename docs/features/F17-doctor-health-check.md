# F17: `ai-init doctor` — Config Health Check & Validation

## TLDR

Add an `ai-init doctor` command that validates the current AI dev environment setup — checking for broken MCP configs, missing files, stale references, and common misconfiguration issues.

## Description

After initial setup (and especially after manual edits), configurations can drift: MCP servers reference missing API keys, rules import docs that were deleted, hooks reference scripts that aren't executable, or CLAUDE.md references a task tracker that was never configured. Currently there's no way to detect these issues except by hitting them at runtime.

### What `doctor` Checks

```bash
ai-init doctor
```

Output:

```
AI Dev Environment Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MCP Configuration
  ✓ .mcp.json is valid JSON
  ✓ .vscode/mcp.json is valid JSON
  ✓ taskmaster-ai server configured
  ✗ context7 server configured but @upstash/context7-mcp not installed
  ⚠ ANTHROPIC_API_KEY not set in environment

Agent Instructions
  ✓ CLAUDE.md exists and is under 200 lines
  ✓ CLAUDE_MCP.md exists
  ✗ CLAUDE.md references docs/api.md but file not found

Rules & Skills
  ✓ 6 rules found in .claude/rules/
  ✓ 3 skills found in .claude/skills/
  ⚠ .claude/rules/api.md imports @docs/api.md — file missing

Hooks
  ✓ .claude/hooks/pre-commit.sh exists
  ✓ pre-commit.sh is executable
  ✓ .claude/settings.json has PreToolUse hook matcher

Task Tracker
  ✓ Task Master configured
  ✓ .taskmaster/tasks/tasks.json exists
  ✓ 23 tasks found (23 done)

Documentation
  ✓ docs/ directory exists (8 files)
  ⚠ docs/prd.md still has placeholder content ({{PROJECT_NAME}})

Summary: 12 passed, 2 warnings, 2 errors
Run 'ai-init update' to fix configuration issues.
```

### Check Categories

1. **MCP Config** — Valid JSON, all servers have required fields, packages are installed globally, API keys are set
2. **Agent Instructions** — CLAUDE.md exists, not too large, cross-references resolve, no broken imports
3. **Rules & Skills** — Files exist, YAML frontmatter is valid, `@import` references resolve
4. **Hooks** — Scripts exist, are executable, settings.json matchers are valid
5. **Task Tracker** — Configured tracker is actually set up, task files exist
6. **Documentation** — Template placeholders have been filled in, no broken links
7. **Dependencies** — Required npm globals are installed (claude, task-master)
8. **Environment** — Required API keys are set (or in `.env`)

### Exit Codes

- `0` — All checks pass (warnings are OK)
- `1` — One or more errors found

Useful for CI: `ai-init doctor || echo "AI dev env needs attention"`

## Value

- **Catch issues early** — find misconfigurations before they waste agent time
- **Onboarding validation** — new team members run `doctor` to verify their setup
- **CI integration** — validate dev environment in automated pipelines
- **Complements `update`** — doctor finds problems, update fixes them

## Changes Required

| File                  | Change                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------- |
| `src/cli.ts`          | Add `doctor` subcommand                                                                |
| `src/doctor.ts`       | New file: all health check logic, organized by category                                |
| `src/types.ts`        | Add `HealthCheck`, `CheckResult` interfaces                                            |
| `src/utils.ts`        | Add `fileExists()`, `isExecutable()`, `isValidJson()` helpers (some may already exist) |
| `src/registry.ts`     | Add `getRequiredEnvVars(serverName)` to check API key requirements                     |
| `test/doctor.test.ts` | New: test each check category with valid/broken fixtures                               |
| `README.md`           | Document `ai-init doctor` command                                                      |
