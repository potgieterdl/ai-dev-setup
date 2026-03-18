---
description: Activates when discussing commits, pushing, or branching
---

# Commit Workflow Skill

## Full Quality Gate Before Commit

Run these steps in order — do not skip any:

1. **Format:** `npm run format` (Prettier)
2. **Lint:** `npm run lint` — fix all errors
3. **Type-check:** `npm run typecheck` (tsc --noEmit)
4. **Build:** `npm run build` — must succeed with zero errors
5. **Test:** `npm test` — all tests must pass

The pre-commit hook enforces this automatically. If it blocks, fix the issue rather than bypassing.

## Commit Message Format

```
<task-id>: <what changed> — <value added>
```

Examples:

- `6: Add rules and skills templates — agents get path-scoped conventions`
- `fix/3.2: Handle null config — prevents crash on first run`

## Branch Naming

- Features: `feat/<task-id>-<short-desc>`
- Bug fixes: `fix/<task-id>-<short-desc>`
- One feature branch at a time — merge before starting the next

## Push Checklist

1. All tests pass locally
2. Branch is up to date with main
3. Commit messages follow the format
4. Task tracker status updated (done or review)
