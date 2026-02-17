# ADR-006: Rules, Skills, Hooks, and Commands Template Design

- **Status:** Accepted
- **Context:** The tool needs to scaffold the full `.claude/` directory structure — rules, skills, hooks, and commands — that transforms Claude Code into a domain-aware, quality-enforcing development partner. These templates implement F3 (Rules, Skills & Hooks), F7 (Git Workflow), and F8 (Custom Commands) from the PRD. The design must align with the existing template conventions established in ADR-005 while addressing the distinct requirements of each template category.
- **Decision:**
  - **Rules** (`templates/rules/`) use YAML frontmatter with `description:` and `paths:` fields. Rules are path-scoped — Claude auto-loads every rule whose `paths:` pattern matches the file being edited. Nine starter rules cover general conventions, docs, testing, git, security, API, database, config, and agent teams.
  - **Skills** (`templates/skills/`) use YAML frontmatter with `description:` only (no `paths:`). Skills activate on keyword matching in conversation rather than file paths. Three starter skills cover testing philosophy, commit workflow, and task management.
  - **Hooks** (`templates/hooks/`) are executable bash scripts, not markdown. The `pre-commit.sh` hook uses `--if-present` flags so it gracefully skips steps that aren't configured yet in early projects. It enforces the 5-step quality gate: format → lint → type-check → build → test.
  - **Commands** (`templates/commands/`) are plain markdown instructions for Claude Code slash commands (`/dev-next`, `/review`). No YAML frontmatter — they are pure instruction text.
  - **Boot prompt** (`templates/boot-prompt.txt`) is a session startup file with `{{PROJECT_NAME}}` and `{{TASK_TRACKER}}` placeholders, referencing project docs and the chosen task tracker.
  - All rules and skills templates use the same `{{PLACEHOLDER}}` convention from ADR-005. The `general.md` rule includes `{{LANGUAGE}}` for project-specific customization.
  - Rules compose automatically — when Claude edits `src/api/users.ts`, it loads `api.md` + `security.md` + `general.md` + `git.md` simultaneously. No rule needs to know about others.
- **Consequences:**
  - Path-scoped rules effectively turn Claude into a domain-specialist agent for whatever file it's touching, without building any agent framework.
  - The `--if-present` pattern in hooks means the pre-commit gate works from day one without requiring all tooling to be configured upfront.
  - Skills complement rules: a rule fires when Claude opens a test file, but the testing skill fires when the user says "write tests" even without a test file open.
  - Commands provide repeatable workflows (`/dev-next`, `/review`) that reference rules and docs, creating a self-reinforcing system.
  - Adding new rules for project-specific concerns (performance, frontend, observability) follows the same pattern — no code changes needed.
