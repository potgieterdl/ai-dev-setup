# ADR-026: Remove Boot Prompt Generation (F12)

- **Status:** Accepted
- **Feature:** F12 (Remove Boot Prompt Generation)
- **Task:** 24 — Remove Boot Prompt Generation
- **Date:** 2026-02-18
- **Supersedes:** ADR-012 (partially — boot-prompt portion only)

## Context

The `boot-prompt.txt` file was originally designed as a session startup instruction file that Claude Code loads on session start. It contained project name, task tracker references, and pointers to `/dev-next` and `/review` commands.

With the maturity of the Claude Code ecosystem, this file became redundant:

- **CLAUDE.md** is auto-loaded by Claude Code at conversation start and contains all project instructions, task tracker references, and workflow rules.
- **MCP servers** (Task Master, Context7, etc.) provide live tool access — no static boot instructions needed.
- **`.claude/rules/`** files auto-compose based on file paths, providing context-aware instructions dynamically.

The boot prompt duplicated content already in CLAUDE.md and rules, creating a maintenance risk where instructions could drift out of sync.

## Decision

Remove all boot-prompt generation from the CLI:

1. **`src/generators/commands.ts`** — Remove boot-prompt.txt from FileDescriptor output. Generator now returns 2 files (dev-next.md, review.md) instead of 3.
2. **`templates/boot-prompt.txt`** — Delete the template file entirely.
3. **Tests** — Remove boot-prompt assertions from unit tests (commands.test.ts, templates.test.ts) and integration tests (bash-parity.test.ts). Add negative assertion confirming boot-prompt is not generated.
4. **README.md** — Remove boot-prompt.txt from the "What Gets Generated" table.
5. **ADR-012** — Updated status to note partial supersession.

The `TEMPLATES_DIR` constant was removed from commands.ts since it was only used to locate boot-prompt.txt. The `COMMANDS_DIR` constant and tracker helper functions (`getTrackerNextCommand`, `getTrackerDoneCommand`) are retained as they are still used by dev-next.md and review.md template rendering.

## Consequences

- **Reduced file clutter** — one fewer generated file for users to manage.
- **No instruction drift** — eliminates a source of conflicting/stale guidance.
- **Simpler mental model** — CLAUDE.md is the single source of truth for agent instructions.
- **Fewer templates to maintain** — reduces template surface area.
- **Breaking change** — users who previously relied on `.claude/boot-prompt.txt` will no longer get it generated. However, since CLAUDE.md already contains all the same information, no functionality is lost.
