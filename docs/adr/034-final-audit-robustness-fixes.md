# ADR-034: Final Audit — Robustness & Edge-Case Fixes

- **Status:** Accepted
- **Context:** After all 32 tasks (F1–F20) were implemented and passing, a full end-to-end audit was conducted to verify the application works as a cohesive whole. The audit covered CLI subcommands, generator output, error handling paths, and non-interactive mode compatibility.
- **Features Referenced:** F1, F3, F6, F11, F15, F16, F17, F19

## Findings & Fixes

### HIGH Severity

1. **wizard.ts — Unsafe non-null assertion on preset lookup (F6, F18)**
   - `allPresets.find(...)!` could crash if the preset list changed between render and selection.
   - **Fix:** Replaced with explicit null check and `process.exit(1)` on missing preset.

2. **hooks.ts — Unsafe JSON type casting in settings merge (F3)**
   - Existing `.claude/settings.json` with unexpected structure (null hooks, non-array PreToolUse) would cause runtime errors during hook generation.
   - **Fix:** Added defensive type guards: validate `hooks` is a non-null object, `PreToolUse` is an array, and each entry has required `matcher`/`hook` properties before merging.

3. **cli.ts — Silent error suppression in installClaudeCode (F11)**
   - `.catch(() => ...)` swallowed all error details, making it impossible to debug installation failures.
   - **Fix:** Capture the error and include its message in the warning output.

### MEDIUM Severity

4. **doctor.ts — Task count always shows 0 for tagged tasks.json format (F17)**
   - Task Master now uses `{ master: { tasks: [...] } }` format, but doctor only checked `data.tasks`. This caused "0 tasks found" even with 32 tasks.
   - **Fix:** Check both `data.tasks` and `data.master?.tasks` (tagged format).

5. **update.ts — Crash in non-interactive mode without flags (F16)**
   - Running `ai-init update` in a non-TTY environment (CI, piped stdin) with no `--add-mcp`/`--tracker`/etc. flags caused an `ExitPromptError` from `@inquirer/prompts`.
   - **Fix:** Detect non-interactive mode (`!process.stdin.isTTY` or `SETUP_AI_NONINTERACTIVE=1`) and print a helpful message listing available flags instead of launching the interactive dashboard.

6. **claude-md.ts — `.taskmaster/CLAUDE.md` referenced before Task Master init (F1, F17)**
   - Generated CLAUDE.md contained `@./.taskmaster/CLAUDE.md` import, but `post-create` does not run `task-master init`, so the file doesn't exist. Doctor flagged this as an error.
   - **Fix:** Wrapped the import in a blockquote noting it activates after `task-master init`, and added `task-master init` to the Quick Reference commands.

## Consequences

- All 598 tests pass with zero failures.
- Build, typecheck, and lint (0 errors) all pass.
- Doctor command now correctly reports 32 tasks and no longer shows false errors for the Task Master reference.
- The `update` subcommand degrades gracefully in non-interactive environments.
- Error messages from Claude Code installation failures are now visible for debugging.
