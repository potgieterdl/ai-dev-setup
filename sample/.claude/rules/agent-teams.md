---
description: Guidance for Claude Code agent teams (experimental)
paths:
  - "**/*"
---

# Agent Teams Guidance

## When to Use Teams

- Multiple independent features with no shared files
- Large refactors where subsystems can be worked on in parallel
- Test writing for existing code (each agent handles a different module)

## When NOT to Use Teams

- Sequential tasks with dependencies
- Database migrations or shared state changes
- Early project setup (one agent is more predictable)

## Team Coordination

- Team lead (Opus) coordinates; teammates (Sonnet) execute
- Each teammate works on its own branch
- Teammates should NOT modify the same files
- Use the task tracker to claim tasks and avoid conflicts

## Git Integration

- Each agent creates its own feature branch: `feat/<task-id>-<agent>-<desc>`
- Merge to main sequentially — resolve conflicts before continuing
- Never force-push on a branch another agent is using
