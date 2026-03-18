# F12: Remove Boot Prompt Generation

## TLDR

Remove `.claude/boot-prompt.txt` generation from the CLI. CLAUDE.md and MCP servers now provide all the context Claude Code needs at session start — the boot prompt is redundant and adds maintenance burden.

## Description

The `boot-prompt.txt` file was originally designed as a startup instruction file that Claude Code loads on session start. However, with the maturity of MCP servers (especially Task Master) and the `CLAUDE.md` auto-loading mechanism, this file is no longer needed:

- **CLAUDE.md** is auto-loaded by Claude Code at conversation start and contains all project instructions, task tracker references, and workflow rules.
- **MCP servers** (Task Master, Context7, etc.) provide live tool access — no need for static boot instructions describing how to use them.
- **`.claude/rules/`** files auto-compose based on file paths, providing context-aware instructions dynamically.

The boot prompt duplicates content already in CLAUDE.md and rules, creating a maintenance risk where instructions drift out of sync.

## Value

- **Reduced file clutter** — one fewer generated file for users to manage
- **No instruction drift** — eliminates a source of conflicting/stale guidance
- **Simpler mental model** — CLAUDE.md is the single source of truth for agent instructions
- **Fewer templates to maintain** — reduces template surface area

## Changes Required

| File                               | Change                                                  |
| ---------------------------------- | ------------------------------------------------------- |
| `src/generators/commands.ts`       | Remove `boot-prompt.txt` from `FileDescriptor[]` output |
| `templates/boot-prompt.txt`        | Delete file                                             |
| `src/types.ts`                     | No change needed (no type references boot prompt)       |
| `src/wizard.ts`                    | Remove any boot-prompt references from summary output   |
| `src/phases/post-create.ts`        | No change (commands generator handles it)               |
| `test/generators/commands.test.ts` | Remove boot-prompt assertions                           |
| `README.md`                        | Remove boot-prompt.txt from "What Gets Generated" table |
| `docs/features/`                   | This doc serves as the ADR for removal                  |
