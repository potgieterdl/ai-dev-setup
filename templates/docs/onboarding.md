# Onboarding: {{PROJECT_NAME}}

> **TLDR:** Quick-start guide for developers and AI agents. Get productive in {{PROJECT_NAME}} in under 10 minutes.

---

## Table of Contents

- [Project Context](#project-context)
- [Key Commands](#key-commands)
- [Where to Find Things](#where-to-find-things)
- [First Steps](#first-steps)

---

## Project Context

<!-- TODO: 1 paragraph describing what this project does, who it's for, and the current state of development -->

## Key Commands

| Command            | What It Does         |
| ------------------ | -------------------- |
| `{{PM_INSTALL}}`   | Install dependencies |
| `{{FORMAT_CMD}}`   | Format code          |
| `{{LINT_CMD}}`     | Lint and fix code    |
| `{{TYPECHECK_CMD}}`| Check types          |
| `{{BUILD_CMD}}`    | Build the project    |
| `{{TEST_CMD}}`     | Run the test suite   |

## Where to Find Things

| What                   | Where                                        |
| ---------------------- | -------------------------------------------- |
| Source code            | `src/`                                       |
| Tests                  | `test/`                                      |
| Documentation          | `docs/`                                      |
| Architecture decisions | `docs/adr/`                                  |
| PRD                    | `docs/prd.md`                                |
| Agent instructions     | `CLAUDE.md`, `.claude/rules/`                |
| MCP configuration      | `.mcp.json`                                  |
| Task tracker           | <!-- TODO: taskmaster / beads / TASKS.md --> |

## First Steps

### For Developers

1. Clone the repo and run `{{PM_INSTALL}}`
2. Read `docs/prd.md` for project context
3. Check `docs/architecture.md` for system design
4. Run `{{TEST_CMD}}` to verify everything works
5. Check the task tracker for your next assignment

### For AI Agents

1. Read `CLAUDE.md` for project instructions
2. Review `.claude/rules/` for path-scoped conventions
3. Check `docs/prd.md` and `docs/architecture.md` for context
4. Get the next task from the task tracker
5. Follow the quality gate before committing
