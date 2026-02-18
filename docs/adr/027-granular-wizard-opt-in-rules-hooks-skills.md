# ADR-027: Granular Wizard Opt-in for Rules, Hooks & Skills (F13)

- **Status:** Accepted
- **Feature:** F13
- **Task:** 26

## Context

The wizard previously used coarse boolean toggles (`generateRules`, `generateSkills`, `generateHooks`) — users either got everything or nothing. For teams with specific needs (e.g., no database rules for a frontend project, or only lint+test in the pre-commit hook), there was no way to customize which individual items were generated without manually deleting files after the fact.

## Decision

Add three new multi-select wizard steps (6b, 6c, 6d) between Step 6 (Database) and Step 7 (Generation confirmation) that let users cherry-pick:

1. **Rules** (`selectedRules`): Which `.claude/rules/` files to generate. Defaults to all 8 rules (general, docs, testing, git, security, config, api, database). The `api` and `database` rules remain gated behind `hasApiDocs`/`hasDatabase` as an additional filter.
2. **Hook steps** (`selectedHookSteps`): Which quality gate steps to include in `pre-commit.sh`. Defaults to all 5 (format, lint, typecheck, build, test). The hook script is now dynamically built instead of read from a static template.
3. **Skills** (`selectedSkills`): Which `.claude/skills/` files to generate. Defaults to all 3 (testing, commit, task-workflow).

The model is **opt-out** (all items checked by default) rather than opt-in, so new users get the full recommended setup unless they explicitly deselect items.

### Non-interactive mode

Three new environment variables support CI/automation:

- `SETUP_AI_RULES` — comma-separated rule names
- `SETUP_AI_HOOKS` — comma-separated hook step names
- `SETUP_AI_SKILLS` — comma-separated skill names

When unset in non-interactive mode, defaults are used (all items).

### Hooks generator change

The hooks generator (`src/generators/hooks.ts`) was refactored from reading a static `templates/hooks/pre-commit.sh` template to dynamically building the script from `STEP_SNIPPETS`. This enables per-step filtering while maintaining the same output format for the default configuration.

## Consequences

- **More flexibility**: Teams can now tailor the generated setup to their project's actual needs.
- **Backward compatible**: Default behavior is unchanged — all items selected by default.
- **Slight wizard length increase**: Three additional multi-select prompts, but they are skipped if the parent category (`generateRules`, etc.) is disabled.
- **Agent teams rule** is excluded from the `selectedRules` picker since it has its own opt-in flag (`agentTeamsEnabled`).
