# ADR-010: Rules, Skills, and Hooks Generators

- **Status:** Accepted
- **Feature:** F3 (Rules, Skills & Hooks Generation)
- **Task:** 10 — Implement Rules, Skills, and Hooks Generators
- **Date:** 2026-02-17

## Context

The CLI generates the `.claude/` directory structure — rules, skills, and hooks — that turns Claude Code into a domain-aware, quality-enforcing development partner. Template files (created in Task 6) live in `templates/rules/`, `templates/skills/`, and `templates/hooks/`. Three generator modules read these templates and return `FileDescriptor[]` for the file I/O layer.

Key requirements:

- **Rules** are conditionally generated based on config flags (`hasApiDocs`, `hasDatabase`, `agentTeamsEnabled`). Six core rules are always generated; three are optional.
- **Skills** are always fully generated (3 files). The `task-workflow.md` skill uses `{{TASK_TRACKER}}` substitution.
- **Hooks** produce the pre-commit quality gate script (marked executable) and a `.claude/settings.json` with the `PreToolUse` hook matcher for `Bash(git commit)`.
- All generators follow the pure-function pattern: `(ProjectConfig) → FileDescriptor[]`.

## Decision

- **Three separate generator files** — `rules.ts`, `skills.ts`, `hooks.ts` — each focused on one concern. This follows the existing pattern where `docs.ts`, `mcp-json.ts`, and `claude-md.ts` are separate. Each generator is independently testable and composable.

- **Async generators** — All three generators are async because they read template files from disk using `fs.readFile`. This is consistent with `docs.ts` and is inherent to the template-reading pattern.

- **Template directory resolved via `import.meta.url`** — Same approach as `docs.ts`, using `fileURLToPath(import.meta.url)` to resolve template directories relative to the source file. Works correctly in ESM and survives TypeScript compilation.

- **Conditional rule generation** — API rules append `\n\n@docs/api.md` as an import directive when `generateDocs` is true, creating a cross-reference between rules and generated docs. Database and agent-teams rules are fully included or excluded based on their respective config flags.

- **`{{LANGUAGE}}` placeholder defaults to TypeScript** — The `general.md` rule template uses `{{LANGUAGE}}` which is set to `"TypeScript"` in the rules generator. This is a reasonable default since the CLI itself is TypeScript. A future wizard step could make this configurable.

- **Settings.json merge strategy for hooks** — The hooks generator reads any existing `.claude/settings.json` from the project root, merges the `PreToolUse` hook entry, and writes the combined result. It avoids duplicate hook entries by checking for existing matchers. If no settings file exists, it creates a new one.

- **Executable flag on pre-commit.sh** — The `FileDescriptor` for `pre-commit.sh` sets `executable: true`, which the `writeFiles()` utility handles by calling `fs.chmod(fullPath, 0o755)`.

## Consequences

- Adding a new rule requires: (1) creating the `.md` template in `templates/rules/`, (2) adding it to either `ALWAYS_RULES` or a conditional block in `rules.ts`, (3) adding tests. The same pattern applies for new skills.
- The hooks generator couples to `.claude/settings.json` structure. If Claude Code changes its settings format, the merge logic needs updating.
- The `{{LANGUAGE}}` default of `"TypeScript"` will be incorrect for non-TypeScript projects. This should be addressed when the wizard (Task 14) is implemented, which can set the language from user input.
- All three generators read from the filesystem, so tests run against actual template files — catching missing templates or broken placeholders that pure unit tests would miss.
