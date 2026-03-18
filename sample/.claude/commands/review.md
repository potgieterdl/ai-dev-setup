Review the current working changes:

1. Run `git diff` to see what changed
2. Check each changed file against the applicable .claude/rules/
3. Verify tests exist for new functionality (integration tests, not mocks)
4. Run the full quality gate: format → lint → type-check → build → test
5. Check that commit messages follow the convention: `<task-id>: <what> — <value>`
6. Report: what looks good, what needs fixing, and whether it's ready to push
