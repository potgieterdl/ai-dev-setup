# F13: Granular Wizard Opt-in for Hooks, Rules & Post-Commit Steps

## TLDR

Add wizard steps that let the user choose which hooks, rules, and post-commit enforcement steps to include — instead of generating all of them by default. Power users get control; beginners get sensible defaults.

## Description

Currently the wizard generates all rules, all skills, all hooks, and the pre-commit quality gate unconditionally (controlled only by top-level `generateRules`/`generateHooks` booleans). Users have no way to cherry-pick which rules or hooks they want without manually deleting files after generation.

This feature adds granular selection:

1. **Rules picker** — Multi-select from the rule set (general, docs, testing, git, security, config, api, database). Show descriptions for each. Default: all selected.
2. **Hooks picker** — Choose which quality gate steps to include in `pre-commit.sh`: format, lint, type-check, build, test. Default: all enabled.
3. **Post-commit behavior** — Ask whether the pre-commit hook should also run on `PostToolUse` after file edits (continuous enforcement vs commit-only).
4. **Skills picker** — Multi-select which skills to generate (testing, commit, task-workflow). Default: all selected.

### Non-interactive mode

New environment variables:

- `SETUP_AI_RULES=general,testing,git` — comma-separated rule names
- `SETUP_AI_HOOKS=format,lint,test` — comma-separated hook steps
- `SETUP_AI_SKILLS=testing,commit` — comma-separated skill names

## Value

- **User control** — teams with existing lint/format workflows can skip duplicate hooks
- **Reduced noise** — small projects don't need database or API rules
- **Flexibility** — users can add rules later via `ai-init update` (F17)
- **Better DX** — wizard becomes a conversation, not a dump

## Changes Required

| File                             | Change                                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/wizard.ts`                  | Add 3 new multi-select prompt steps (rules, hooks, skills) between current Steps 6-7                        |
| `src/types.ts`                   | Add `selectedRules: string[]`, `selectedHookSteps: string[]`, `selectedSkills: string[]` to `ProjectConfig` |
| `src/defaults.ts`                | Set defaults to include all rules/hooks/skills                                                              |
| `src/generators/rules.ts`        | Filter output by `config.selectedRules`                                                                     |
| `src/generators/hooks.ts`        | Build `pre-commit.sh` dynamically from `config.selectedHookSteps`                                           |
| `src/generators/skills.ts`       | Filter output by `config.selectedSkills`                                                                    |
| `test/generators/rules.test.ts`  | Add tests for filtered rule generation                                                                      |
| `test/generators/hooks.test.ts`  | Add tests for partial hook steps                                                                            |
| `test/generators/skills.test.ts` | Add tests for filtered skill generation                                                                     |
| `README.md`                      | Document new env vars and wizard steps                                                                      |
