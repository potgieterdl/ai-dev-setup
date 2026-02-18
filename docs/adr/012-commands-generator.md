# ADR-012: Commands Generator with Tracker-Specific Substitution

- **Status:** Accepted (partially superseded by ADR-026 — boot-prompt removed)
- **Feature:** F8 (Custom Claude Commands)
- **Task:** 12 — Implement Commands Generator
- **Date:** 2026-02-17

## Context

Claude Code supports slash commands via `.claude/commands/` markdown files (e.g., `/dev-next`, `/review`) and a session startup boot prompt (`.claude/boot-prompt.txt`). These commands encapsulate common workflows and need to reference the user's chosen task tracker. The PRD specifies two commands (`/dev-next` for picking up the next task, `/review` for reviewing changes) and a boot prompt that orients Claude at session start.

Key requirements:

- Commands must contain tracker-specific instructions (e.g., `task-master next` vs `bd show` vs reading `TASKS.md`)
- Templates should be editable markdown with `{{PLACEHOLDER}}` markers
- The generator must follow the established pure-function pattern: config in, FileDescriptor[] out
- Boot prompt must reference the project name and task tracker

## Decision

- **Template-based async generator** — `generateCommands(config: ProjectConfig): Promise<FileDescriptor[]>` reads templates from `templates/commands/` and `templates/boot-prompt.txt`, matching the pattern established by `skills.ts` and `rules.ts`. Templates are plain markdown with `{{PLACEHOLDER}}` markers processed by `fillTemplate()`.
- **Four template variables** — `{{PROJECT_NAME}}`, `{{TASK_TRACKER}}`, `{{TASK_TRACKER_NEXT}}`, and `{{TASK_TRACKER_DONE}}` cover all tracker-specific substitutions. The latter two are derived from the tracker choice via helper functions `getTrackerNextCommand()` and `getTrackerDoneCommand()`.
- **Three tracker mappings** — Each tracker type maps to a specific "next task" and "mark done" command string:
  - `taskmaster` → `task-master next` / `task-master set-status --id=<id> --status=done`
  - `beads` → `bd show` / `bd update <id> --status done && bd sync`
  - `markdown` → human-readable instructions for editing `TASKS.md`
- **Always returns 2 files** — `.claude/commands/dev-next.md` and `.claude/commands/review.md`. Boot-prompt.txt was removed in F12 (see ADR-026) — CLAUDE.md provides session context.
- **review.md has no tracker placeholders** — The review command is tracker-agnostic (it reviews git diff and runs the quality gate). This keeps it simple and avoids unnecessary coupling to the task tracker.

## Consequences

- Adding a new task tracker option requires updating the two switch functions (`getTrackerNextCommand`, `getTrackerDoneCommand`) and adding a case. The template files themselves don't need to change.
- The boot prompt serves as a "cheat sheet" for Claude sessions, reducing the context-loading overhead at session start. This aligns with the PRD's goal of making agents productive immediately.
- Trade-off: Template files are read from disk at generation time (async I/O). This is consistent with skills/rules generators but means the generator can't be called in a pure synchronous context. This is acceptable since all generators are called from the async `runPostCreate` orchestrator.
