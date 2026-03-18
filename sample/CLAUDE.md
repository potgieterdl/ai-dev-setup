# Project Instructions for Claude Code

## Project Documentation

@docs/doc_format.md
@docs/prd.md
@docs/architecture.md
@docs/testing_strategy.md
@docs/onboarding.md
@docs/api.md

## Task Tracker: Simple Markdown

- Edit `TASKS.md` directly to manage tasks
- Mark tasks with `[x]` when done
- Add a demo command for each task before marking done
- Keep the summary table at the top in sync with task details

## Agent Rules

Path-scoped rules in `.claude/rules/` auto-load based on the file being edited.
Multiple rules compose — when editing `src/api/users.ts`, rules for api, security, and general all load simultaneously.

## Quality Gate

Before marking any task done:

1. Format: `npm run format`
2. Lint: `npm run lint`
3. Type-check: `npm run typecheck`
4. Build: `npm run build`
5. Test: `npm test`

Never mark a task done if any step fails. Fix issues first.