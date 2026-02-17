---
description: Activates when picking up tasks, starting work, or managing task status
---

# Task Workflow Skill

## Picking a Task

1. Run `next` (or check the task tracker) to find the next available task
2. Review the task details: description, dependencies, test strategy
3. Check that all dependencies are marked `done`
4. Set the task to `in-progress`

## Implementing a Task

1. Read relevant docs: `docs/prd.md`, `docs/architecture.md`, `docs/adr/`
2. Check the dependency chain — review what previous tasks built
3. Plan the implementation — log notes with `update-subtask`
4. Write the code following `.claude/rules/` conventions
5. Write tests following the integration-first philosophy
6. Run the full quality gate: format → lint → type-check → build → test

## Completing a Task

1. Verify all tests pass
2. Verify the feature is demonstrable (demo test exists)
3. Create a commit: `<task-id>: <what changed> — <value added>`
4. Set the task to `done` (or `review` if using the checker workflow)
5. Check for the next task

## When Stuck

- Check `docs/adr/` for relevant architectural decisions
- Review the PRD for context on what we're building
- Log progress and blockers with `update-subtask`
- If blocked, set status to `blocked` with an explanation
