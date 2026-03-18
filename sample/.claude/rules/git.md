---
description: Git workflow and commit conventions
paths:
  - "**/*"
---

# Git Workflow Rules

## Branch Strategy

- One feature branch at a time — finish and merge before starting the next
- Branch naming: `feat/<task-id>-<short-desc>` or `fix/<task-id>-<short-desc>`
- Before starting a new task, ensure the previous branch is merged or committed

## Commit Messages

Format: `<task-id>: <what changed> — <value added>`

Examples:

- `6: Add rules templates — agents get path-scoped coding conventions`
- `fix/12: Handle missing API key — graceful degradation instead of crash`

## Before Committing

The pre-commit hook enforces the quality gate automatically:

1. Format (Prettier)
2. Lint (ESLint)
3. Type-check (tsc)
4. Build
5. All tests pass

If the hook blocks a commit, **fix the issue** — do not bypass with `--no-verify`.

## Task Tracker Integration

- **Task Master:** Run `set-status --id=<id> --status=done` after merge
- **Beads:** Run `bd sync` before push
- **Markdown:** Update `TASKS.md` status manually

## Agent Teams

When multiple agents work in parallel on feature branches, each agent handles its own git syncing. Defer to the team harness for coordination.
