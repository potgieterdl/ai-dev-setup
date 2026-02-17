Refer to the project documentation relevant to the current task:

1. Read docs/prd.md for context on what we're building
2. Check docs/architecture.md for system design constraints
3. Check docs/adr/ for architecture decisions that affect this area
4. Review the dependency chain — check previous tasks that built prerequisite capability
5. Check the last git commit to understand what was done before

Once you have context:

- Get the next available task: `{{TASK_TRACKER_NEXT}}`
- Implement it following the project conventions in .claude/rules/
- The pre-commit hook will enforce the quality gate automatically
- Mark task complete: `{{TASK_TRACKER_DONE}}`
- Create a commit: `<task-id>: <change summary> — <value added>`
- Report what was done and ask if you should continue to the next task
