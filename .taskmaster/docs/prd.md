# PRD: AI Project Init (ai-helper-tools)

> **Version:** 2.1 · **Status:** Draft · **Last updated:** 2026-02-17

---

## Table of Contents

- [1. Problem](#1-problem)
- [2. Solution](#2-solution)
- [3. Scope Boundary](#3-scope-boundary)
- [4. User Personas](#4-user-personas)
- [5. Features](#5-features)
  - [F1: TypeScript CLI with Single-Line Install](#f1-typescript-cli-with-single-line-install)
  - [F2: Document Scaffolding](#f2-document-scaffolding)
  - [F3: Rules, Skills & Hooks Generation](#f3-rules-skills--hooks-generation)
  - [F4: MCP Server Configuration](#f4-mcp-server-configuration)
  - [F5: Task Tracker Selection](#f5-task-tracker-selection)
  - [F6: Guided Project Kickstart](#f6-guided-project-kickstart)
  - [F7: Git Workflow Guidance](#f7-git-workflow-guidance)
  - [F8: Custom Claude Commands](#f8-custom-claude-commands)
  - [F9: Testing Strategy Guidance](#f9-testing-strategy-guidance)
  - [F10: Agent Teams Configuration](#f10-agent-teams-configuration)
  - [F11: Claude Code Bootstrap & Audit](#f11-claude-code-bootstrap--audit)
- [6. Architecture](#6-architecture)
- [7. Development Phases](#7-development-phases)
- [8. Success Criteria](#8-success-criteria)
- [9. Risks](#9-risks)
- [10. Out of Scope](#10-out-of-scope)

---

## 1. Problem

Starting an AI-assisted coding project (Claude Code, Gemini CLI, Copilot) requires significant manual setup: installing tools, configuring MCP servers, writing CLAUDE.md instructions, structuring documentation so agents can consume it, choosing a task tracker, and establishing git workflow conventions. Each new Codespace or project repeats this work. Without proper scaffolding, agents operate with poor context — they guess at architecture, hallucinate API endpoints, write mock-heavy tests that verify nothing, and ignore project conventions.

## 2. Solution

**AI Project Init** is a single-entry-point bootstrap tool that turns an empty workspace into an agent-ready development environment. It installs AI tooling, scaffolds agent-optimized documentation templates, configures MCP servers, generates the full `.claude/` directory structure (rules, skills, hooks, commands), sets up a task tracker, and establishes git and testing conventions. After this tool runs, an AI agent can immediately begin productive, context-aware work.

**Key principle:** This tool handles _setup and scaffolding only_. It exits after configuration. Other tools (Claude Code, Task Master, Beads) take over for the actual development cycle.

## 3. Scope Boundary

| In scope                                                    | Out of scope                                     |
| ----------------------------------------------------------- | ------------------------------------------------ |
| Tool installation (Claude Code, Task Master, Beads)         | Being a task tracker or IDE                      |
| Claude Code headless audit of generated scaffolding         | Running or orchestrating AI agents               |
| MCP server registration & config                            | Writing actual project code                      |
| Document template scaffolding                               | CI/CD pipeline creation or management            |
| Full `.claude/` generation (rules, skills, hooks, commands) | Multi-repo orchestration                         |
| TypeScript CLI with single-line install                     | Being a full framework (oclif, yeoman)           |
| Devcontainer.json generation                                | Template library for specific frameworks         |
| Git workflow guidance + pre-commit hooks                    | AI-driven PRD generation (review only — see F11) |
| Testing strategy guidance & rules                           | Hosting, deployment, or infrastructure           |
| Agent teams opt-in configuration                            | Running agent teams (that's Claude Code)         |
| Guided PRD iteration (template-driven)                      |                                                  |

## 4. User Personas

**Primary: Solo developer starting a new AI-assisted project**

- Has an idea or rough PRD, wants to go from zero to "Claude, build this" fast
- May be in GitHub Codespaces or local dev
- Comfortable with terminal, may not know Claude Code/MCP best practices

**Secondary: Team lead setting up a shared AI dev environment**

- Wants consistent agent instructions across team members
- Uses devcontainer for reproducibility
- Needs docs structured so any agent (not just Claude) can consume them

## 5. Features

### F1: TypeScript CLI with Single-Line Install

**What:** Rewrite the 1,400-line bash monolith as a TypeScript CLI. Distributed via GitHub — users install with a single `curl` command. A thin `install.sh` bootstrap ensures Node.js is available (via fnm if needed), then runs the CLI.

**Why:** Bash is hard to test, hard to refactor, and gets brittle at scale. TypeScript gives us type safety, pure-function generators that are trivially testable, and access to the Node ecosystem for prompts and argument parsing — while staying simple (no framework, no plugin system).

**Install (Linux):**

```bash
curl -fsSL https://raw.githubusercontent.com/potgieterdl/ai-helper-tools/main/install.sh | bash
```

**What `install.sh` does:**

1. Check for Node.js ≥ 20 — if missing, install via [fnm](https://fnm.vercel.app/) (fast, single-binary Node version manager)
2. Clone/pull the repo to `~/.ai-helper-tools` (or `$AI_HELPER_HOME`)
3. Run `npm ci` (dependencies are checked in via lockfile)
4. Symlink `ai-init` to `~/.local/bin/` (or add to PATH)
5. Print: `Run 'ai-init' in any project directory to get started`

**Usage after install:**

```bash
cd my-project
ai-init                    # Interactive wizard
ai-init --non-interactive  # Env-var driven, no prompts
ai-init on-create          # Codespace lifecycle: heavy installs
ai-init post-create        # Codespace lifecycle: project scaffolding
ai-init post-start         # Codespace lifecycle: per-session setup
```

**Source structure:**

```
src/
├── cli.ts                # Entry point + arg parsing (meow)
├── wizard.ts             # Interactive prompts (@inquirer/prompts)
├── registry.ts           # MCP server definitions
├── phases/
│   ├── on-create.ts      # Heavy installs (npm globals)
│   ├── post-create.ts    # Project config orchestration
│   └── post-start.ts     # Per-session setup (.env, banner)
├── generators/           # Pure functions: config → file descriptors
│   ├── mcp-json.ts       # .mcp.json + .vscode/mcp.json
│   ├── claude-md.ts      # CLAUDE.md + CLAUDE_MCP.md
│   ├── devcontainer.ts   # .devcontainer/devcontainer.json
│   ├── docs.ts           # Document scaffolding (F2)
│   ├── rules.ts          # .claude/rules/ generation (F3)
│   ├── skills.ts         # .claude/skills/ generation (F3)
│   └── hooks.ts          # .claude/hooks/ generation (F3)
└── utils.ts              # Shared helpers (file write, shell exec)
```

**Key design choice — generators are pure functions:**

```typescript
// generators/mcp-json.ts
export function generateMcpJson(config: ProjectConfig): FileDescriptor[] {
  return [
    {
      path: ".mcp.json",
      content: JSON.stringify(buildMcpConfig(config), null, 2),
    },
    {
      path: ".vscode/mcp.json",
      content: JSON.stringify(buildVscodeMcpConfig(config), null, 2),
    },
  ];
}
```

Generators take config in, return `{ path, content }[]` out. They never touch the filesystem directly. A single `writeFiles()` utility handles all I/O. This makes every generator trivially testable — no temp dirs, no mocks, just assert on the returned content.

**Self-testing (dogfooding):**

```
test/
├── generators/           # Unit tests — pure function in/out
│   ├── mcp-json.test.ts
│   ├── claude-md.test.ts
│   └── rules.test.ts
├── integration/          # End-to-end — runs ai-init in a temp dir
│   └── wizard.test.ts    # Uses @inquirer/testing for prompt automation
└── fixtures/             # Cleanup: tests create temp dirs, tear them down
```

Tests use `vitest`. Integration tests run the full CLI against a temporary project directory, verify the generated files exist and have correct content, then clean up. The test suite itself demonstrates the integration-first testing philosophy from F9 — the tool dogfoods its own testing guidance.

**Non-interactive mode:** Same env vars as before (`SETUP_AI_MCPS`, `SETUP_AI_TRACKER`, `SETUP_AI_NONINTERACTIVE`) — the wizard reads them and skips prompts when set.

### F2: Document Scaffolding

**What:** Generate a `docs/` folder with agent-optimized document templates. Each template follows a standard format defined in `docs/doc_format.md`.

**Templates generated:**
| File | Purpose |
|---|---|
| `docs/doc_format.md` | Meta-doc: how all docs should be structured (TOC, concise sections, agent-consumable) |
| `docs/prd.md` | Product requirements — problem, solution, features, phases |
| `docs/architecture.md` | System design — tier overview, component map, links to detail docs |
| `docs/api.md` | API surface — table format: endpoint, method, description, ADR ref, source file |
| `docs/cuj.md` | Critical user journeys — step-by-step flows agents should understand |
| `docs/testing_strategy.md` | Testing approach — integration-first philosophy, what to test, demo checkpoints |
| `docs/onboarding.md` | Quick-start for humans AND agents — project context ramp-up, key commands, where to find things |
| `docs/adr/` | Architecture Decision Records — numbered (`001-use-jwt-auth.md`) with status, context, decision, consequences |

**Doc format standard (`doc_format.md`):**

- Every doc starts with a TOC linking to `#section` anchors
- Sections are short (aim for <30 lines each) — agents struggle with long unstructured text
- Tables preferred over prose for structured data (APIs, config, mappings)
- Each doc has a "TLDR" section at the top (1-3 sentences max)
- Cross-references use relative links: `See [API docs](api.md#authentication)`
- No redundant content — link to source of truth instead of duplicating
- Max ~500 lines per doc; split into linked sub-docs if larger

**ADR format (`docs/adr/NNN-title.md`):**

```markdown
# ADR-001: Use JWT for Authentication

- **Status:** Accepted | Superseded | Deprecated
- **Context:** Why this decision was needed
- **Decision:** What was decided
- **Consequences:** Trade-offs accepted
```

Agents reference ADRs when making implementation choices — the `/dev-next` command (F8) explicitly checks `docs/adr/` before starting work.

**Skip logic:** If a file already exists, the wizard asks whether to overwrite or skip.

### F3: Rules, Skills & Hooks Generation

**What:** Generate the `.claude/` directory structure — rules, skills, and hooks — that turns Claude Code into a domain-aware, quality-enforcing development partner. Rules are the centerpiece: path-scoped markdown files that compose automatically, making Claude behave like a specialist for whatever code it touches. (Commands are covered separately in F8.)

#### Rules (`.claude/rules/`)

Path-scoped instruction files with YAML frontmatter. Claude auto-loads every rule whose `paths:` pattern matches the file being edited. Multiple rules compose — no rule needs to know about any other.

**Generated starter rules:**
| File | Scope | Content |
|---|---|---|
| `CLAUDE.md` | Global | Top-level agent instructions: doc references, workflow, task tracker usage, quality gate |
| `.claude/rules/general.md` | Global | Project-wide conventions: language version, package manager, coding style |
| `.claude/rules/docs.md` | `docs/**` | How to read/update project docs, follow doc_format.md |
| `.claude/rules/testing.md` | `**/*.test.*`, `**/*.spec.*` | Integration-first testing strategy, quality gate, demo checkpoints (F9) |
| `.claude/rules/git.md` | Global | Git workflow rules (F7) |
| `.claude/rules/security.md` | `src/auth/**`, `src/middleware/**`, `**/*secret*` | Input validation, no credential logging, OWASP basics |
| `.claude/rules/api.md` | `src/api/**`, `src/routes/**` | RESTful conventions, standard error shapes, input validation, ties to docs/api.md |
| `.claude/rules/database.md` | `src/db/**`, `src/models/**`, `**/migrations/**` | Parameterized queries, migration discipline, no raw SQL |
| `.claude/rules/config.md` | `**/*.config.*`, `**/.env*` | Never hardcode secrets, use env vars, document in .env.example |

**Rules compose.** When Claude edits `src/api/users.ts`, it simultaneously loads `api.md` + `security.md` + `general.md` + `git.md`. No rule needs to know about the others — they layer automatically. This means path-scoped rules effectively turn Claude into a domain-specialist agent for whatever file it's touching, without building any agent framework.

**Scaling pattern for larger apps.** The starter set above covers common concerns. As a project grows, users (or their agents) add domain-specific rules:
| Concern | Example paths | What it prevents |
|---|---|---|
| Performance | `src/api/**`, `src/db/**` | N+1 queries, missing pagination, no connection pooling |
| Frontend | `src/components/**`, `**/*.tsx` | Accessibility gaps, inconsistent component patterns |
| Error handling | `src/**` (broad) | Swallowed errors, unstructured throws |
| Observability | `src/api/**`, `src/services/**` | Missing logging, no trace context |

The generated `CLAUDE.md` tells agents that `.claude/rules/` exists and should be consulted, making the system self-reinforcing — agents discover and follow new rules automatically when they're added.

**Dynamic generation:** Rules reference the actual docs from F2 via `@import`. If `docs/api.md` exists, `.claude/rules/api.md` includes `@docs/api.md`. If the user skipped API docs, this rule is omitted.

#### Skills (`.claude/skills/`)

Keyword-activated knowledge files with YAML `description:` frontmatter. Unlike rules (which fire on file paths), skills activate when Claude's conversation matches their description — like on-demand domain expertise.

**Generated starter skills:**
| File | Activates on | Content |
|---|---|---|
| `.claude/skills/testing.md` | "test", "coverage", "demo" | Integration-first philosophy, demo-test patterns, mock justification rules (F9) |
| `.claude/skills/commit.md` | "commit", "push", "branch" | Full commit workflow: quality gate → format → lint → type-check → build → test → commit |
| `.claude/skills/task-workflow.md` | "next task", "pick up", "start working" | How to pick, implement, verify, and close a task using the chosen tracker |

Skills complement rules: a rule fires when Claude opens a test file, but the testing _skill_ fires when the user says "write tests for auth" even if no test file is open yet. Together they ensure Claude always has the right knowledge loaded.

#### Hooks (`.claude/hooks/`)

Event-driven scripts that enforce quality gates automatically. Hooks fire on Claude Code tool-use events (`PreToolUse`, `PostToolUse`) — they're the enforcement layer that catches mistakes before they reach git.

**Generated hook: pre-commit quality gate**

Configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(git commit)",
        "hook": ".claude/hooks/pre-commit.sh"
      }
    ]
  }
}
```

**`.claude/hooks/pre-commit.sh`:**

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Running quality gate before commit..."

# 1. Format
npm run format --if-present 2>/dev/null || true

# 2. Lint (fail on errors)
npm run lint --if-present || { echo "BLOCK: Lint errors found. Fix before committing."; exit 1; }

# 3. Type-check
npm run typecheck --if-present || { echo "BLOCK: Type errors found. Fix before committing."; exit 1; }

# 4. Build
npm run build --if-present || { echo "BLOCK: Build failed. Fix before committing."; exit 1; }

# 5. Test
npm test --if-present || { echo "BLOCK: Tests failing. Fix before committing."; exit 1; }

echo "Quality gate passed."
```

**Why pre-commit, not pre-push:** By the time code reaches `git push`, it should already be clean. Running lint+test at commit time means every commit in history is verified — no "fix lint" follow-up commits, no broken intermediate states. By the time we push, everything is already perfect.

**Skip logic for early projects:** The hook uses `--if-present` so it doesn't block when lint/test scripts haven't been configured yet. As the project adds tooling, the hook automatically picks it up.

**Compatibility:** While hooks use Claude Code's settings format, the underlying scripts are standard bash — they can be symlinked to `.git/hooks/pre-commit` for non-Claude workflows too.

### F4: MCP Server Configuration

**What:** Expanded MCP registry with beads-mcp added. Generates both `.mcp.json` (Claude Code) and `.vscode/mcp.json` (VS Code/Copilot).

**Dual-file MCP config:** Claude Code and VS Code use different JSON schemas for MCP server registration, so both files must be generated:

| Aspect         | `.mcp.json` (Claude Code)                 | `.vscode/mcp.json` (VS Code / Copilot)                              |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| Root key       | `"mcpServers"`                            | `"servers"`                                                         |
| Workspace path | Not needed (uses cwd)                     | `"cwd": "${workspaceFolder}"`                                       |
| API keys       | Inherited from shell environment / `.env` | `"${env:VAR_NAME}"` syntax + `"envFile": "${workspaceFolder}/.env"` |
| Extra fields   | —                                         | `envFile`, explicit `env` block with key references                 |

Both files list the same servers with the same `npx` commands and args — only the wrapper structure differs. The generator must emit both to ensure MCP servers work regardless of whether the user opens the project in Claude Code CLI or VS Code with Copilot.

**Registry additions:**

| Name                | Package                                        | Purpose                                  | Required               |
| ------------------- | ---------------------------------------------- | ---------------------------------------- | ---------------------- |
| taskmaster          | `task-master-ai`                               | Task orchestration & dependency tracking | If selected as tracker |
| beads               | `beads-mcp`                                    | Distributed git-backed issue tracking    | If selected as tracker |
| context7            | `@upstash/context7-mcp`                        | Live library docs lookup                 | No                     |
| browsermcp          | `@anthropic-ai/mcp-server-puppeteer`           | Browser automation/testing               | No                     |
| sequential-thinking | `@anthropic-ai/mcp-server-sequential-thinking` | Structured reasoning                     | No                     |

**beads-mcp specifics:**

- Install: `npm install -g @beads/bd` + `pip install beads-mcp` (or `uv tool install beads-mcp`)
- Init: `bd init --quiet` in project root
- CLAUDE_MCP.md gets beads tool documentation (beads_ready, beads_create, beads_show, beads_update, beads_close, beads_dep_add, beads_dep_tree, beads_sync)
- Hash-based IDs (e.g., `bd-a1b2`) — agents reference beads by ID in commits and branches
- Hierarchical tasks: parent/child relationships via `beads_dep_add`, viewable with `beads_dep_tree`
- Contributor modes (stealth/contributor/maintainer) — setup wizard sets the mode based on team size

### F5: Task Tracker Selection

**What:** During setup wizard, user picks one of three task tracking approaches. This choice drives which MCP is installed, which CLAUDE.md instructions are generated, and which templates are scaffolded.

**Options:**
| Option | Best for | Installs |
|---|---|---|
| **Task Master** (default) | Full projects with subtasks, research, complexity analysis | task-master-ai npm + MCP |
| **Beads** | Multi-agent workflows, git-native issue tracking, team projects | @beads/bd + beads-mcp |
| **Simple Markdown** | Hello-world / ≤20 tasks, one-shot projects | Nothing extra — generates `TASKS.md` |

**Simple Markdown format (`TASKS.md`):**

```markdown
# Task Tracker

## Summary

| #   | Task                    | Status | Depends |
| --- | ----------------------- | ------ | ------- |
| 1   | Setup project structure | [x]    | —       |
| 2   | Implement auth          | [ ]    | 1       |

## Tasks

### Task 1: Setup project structure

- **Status:** Done
- **Depends on:** —
- **Success:** Project runs `npm start` without errors
- **Notes:** Created src/ structure with Express boilerplate

### Task 2: Implement auth

- **Status:** Pending
- **Depends on:** Task 1
- **Success:** Login/logout works with JWT, tests pass
- **Demo command:** `npm test -- --grep "auth"`
```

The `Demo command` field is key — it's the single command that proves a task works. Agents run it before marking done; humans run it during review.

CLAUDE.md instructions differ per selection — agents must know which tool to use and how.

### F6: Guided Project Kickstart

**What:** An interactive wizard (runs when `ai-init` is invoked without args) that walks the user through project setup sequentially. Each step can be skipped. Built with `@inquirer/prompts` for a clean terminal UI.

**Wizard flow:**

```
Step 0: Claude Code Bootstrap     (Install Claude Code if missing — required for audit)
Step 1: MCP Server Selection      (existing — enhanced UI)
Step 2: Task Tracker Choice       (TaskMaster / Beads / Simple Markdown)
Step 3: PRD                       ("I have a PRD" → import path, or use template)
Step 4: Architecture              ("Skip" or pick: monolith / 2-tier / 3-tier / microservices)
Step 5: API Surface               ("Skip" or scaffold api.md from architecture choice)
Step 6: Doc Generation            (Generate remaining docs from choices above)
Step 7: Agent Instructions        (Generate CLAUDE.md + full .claude/ directory from docs)
Step 8: Agent Teams (opt-in)      (Enable experimental multi-agent mode — skip by default)
Step 9: AI-Powered Audit          (Claude Code headless reviews all generated files — see F11)
Step 10: Summary & Next Steps     (Print what was created, audit findings, what to do next)
```

**Step 0 — Claude Code Bootstrap:** See F11 Part 1 for full details. The wizard ensures Claude Code is installed and authenticated before proceeding. If auth fails, all steps run normally except Step 9 (audit), which is skipped with a warning.

**PRD iteration:** In Step 3, if the user doesn't have a PRD:

1. Present the PRD template with placeholder sections
2. Open it in `$EDITOR` (or `code`) for editing
3. User fills in what they can, saves, returns to wizard
4. Wizard continues to architecture (which can reference what was written)

**Architecture picker:** Step 4 is a simple menu, not a design tool. It populates `docs/architecture.md` with the right tier labels and component stubs. The user (or their agent) fills in details later.

**Non-interactive mode:** All choices can be pre-set via environment variables:

```bash
SETUP_AI_MCPS="taskmaster,context7"
SETUP_AI_TRACKER="taskmaster"    # taskmaster | beads | markdown
SETUP_AI_ARCH="3-tier"           # monolith | 2-tier | 3-tier | microservices | skip
SETUP_AI_SKIP_AUDIT=0            # 1 to skip the Claude Code audit step
SETUP_AI_NONINTERACTIVE=1
```

### F7: Git Workflow Guidance

**What:** Generate `.claude/rules/git.md` with single-feature-at-a-time workflow rules.

**Rules content:**

- One feature branch at a time (no parallel feature branches for solo/small team work)
- Branch naming: `feat/<task-id>-<short-desc>`, `fix/<task-id>-<short-desc>`
- Commit message format: `<task-id>: <what changed> — <value added>`
- Before starting a new task: ensure previous branch is merged/committed
- Before committing: hooks enforce the quality gate automatically (F3 hooks), but rule reminds agents to fix issues rather than bypass
- Beads users: `bd sync` before push; Task Master users: `set-status --status=done` after merge

**Pre-commit enforcement:** The git rule works in tandem with the pre-commit hook (F3). The rule tells the agent _what_ to do; the hook _enforces_ it. By the time code reaches `git push`, every commit is already verified — no broken intermediate states, no "fix lint" follow-up commits.

**Agent teams note:** When using Claude Code agent teams (multiple parallel agents on feature branches), agents handle their own git syncing. The rules file acknowledges this and defers to the team harness.

### F8: Custom Claude Commands

**What:** Generate Claude Code slash commands that encapsulate common workflows. These live in `.claude/commands/` and are invoked via `/command-name` in Claude.

**Commands generated:**

**`/dev-next` (`.claude/commands/dev-next.md`):**

```markdown
Refer to the project documentation relevant to the current task:

1. Read docs/prd.md for context on what we're building
2. Check docs/architecture.md for system design constraints
3. Check docs/adr/ for architecture decisions that affect this area
4. Review the dependency chain — check previous tasks that built prerequisite capability
5. Check the last git commit to understand what was done before

Once you have context:

- Get the next available task from the task tracker
- Implement it following the project conventions in .claude/rules/
- The pre-commit hook will enforce the quality gate automatically
- Create a commit: `<task-id>: <change summary> — <value added>`
- Report what was done and ask if you should continue to the next task
```

**`/review` (`.claude/commands/review.md`):**

```markdown
Review the current working changes:

1. Run `git diff` to see what changed
2. Check each changed file against the applicable .claude/rules/
3. Verify tests exist for new functionality (integration tests, not mocks)
4. Run the full quality gate: format → lint → type-check → build → test
5. Check that commit messages follow the convention: `<task-id>: <what> — <value>`
6. Report: what looks good, what needs fixing, and whether it's ready to push
```

**Boot prompt (`.claude/boot-prompt.txt`):** A startup instruction file that Claude Code loads on session start. Updated to reference project docs and the chosen task tracker. Listed in the architecture tree under `templates/`.

### F9: Testing Strategy Guidance

**What:** Generate testing philosophy docs and agent rules that enforce integration-first testing and demo-ability checkpoints. This addresses a critical gap in AI-generated code: agents default to writing mocks and stubs that pass but don't verify real behavior.

**Why:** The Claude C compiler project demonstrated that the single most important factor in sustained autonomous progress was high-quality, realistic tests. Mocks give AI agents false confidence — the tests pass but the code doesn't work. Integration tests that exercise real functionality act as both verification and regression safety nets as the codebase grows.

**Testing philosophy (encoded in `docs/testing_strategy.md` and `.claude/rules/testing.md`):**

1. **Integration tests over mocks** — Test real behavior by default. Only use mocks for external services that can't be run locally (3rd-party APIs, payment gateways). For databases, message queues, and internal services: use real instances (Docker, in-memory, test containers)
2. **Every feature should be demonstrable** — When a feature task is marked done, there should be a test (or small set of tests) that a human could run to see the feature working. This is the "demo test" — it serves as both proof and regression guard
3. **Scaffold wiring gets basic smoke tests** — Early tasks (project setup, boilerplate, config) may not have business-level outcomes. These get minimal smoke tests: "app starts without errors", "health endpoint returns 200", "database connection succeeds"
4. **No false green** — A test suite where every test uses mocks is worse than no tests at all because it creates false confidence. Agents should justify mock usage with a comment explaining why a real instance isn't feasible
5. **Test as regression gate** — Before any commit, all existing tests must pass. This is already in the quality gate (F8) but the testing rule reinforces: never skip tests, never delete a failing test to make CI green

**Impact on PRD template (F2):** The PRD template's feature section includes a `Demo test` field:

```markdown
### Feature: User Authentication

- **Business outcome:** Users can sign up and log in securely
- **Demo test:** `POST /auth/signup` with valid payload returns 201 + JWT;
  `POST /auth/login` with those credentials returns 200 + new JWT;
  `GET /protected` with JWT returns 200, without returns 401
- **Acceptance:** Integration test in `tests/auth.integration.test.ts` passes
```

**Impact on task descriptions:** Both Task Master and simple markdown task templates include:

- **"What success looks like"** — already present, now explicitly tied to a runnable test
- **"Demo command"** — the single command that proves the task works (e.g., `npm test -- --grep "auth"`, `curl localhost:3000/health`)

**Impact on agent instructions (`.claude/rules/testing.md`):**

```markdown
# Testing Rules

## Default: Integration tests

- Write tests that exercise real code paths. Use actual database connections,
  real HTTP requests to local servers, real file I/O.
- Only mock external 3rd-party services. Add a comment: `// Mock: <service> — no local instance available`
- If you find yourself mocking more than 2 dependencies in a test, reconsider:
  the test may be testing the wrong layer.

## Demo checkpoints

- Each feature task should produce at least one integration test that
  demonstrates the feature working end-to-end.
- Name demo tests clearly: `it('demo: user can sign up and access protected route')`
- These tests double as regression guards — never delete or skip them.

## Smoke tests for wiring tasks

- Setup/config tasks that don't have a business outcome get smoke tests:
  app starts, health check passes, key dependencies connect.
- Mark these as `it('smoke: ...')` so they're easy to identify.

## Quality gate (pre-commit)

1. Format → 2. Lint → 3. Type-check → 4. Build → 5. ALL tests pass

- Never delete a test to make the suite pass.
- Never mark a task done if tests are failing.
```

### F10: Agent Teams Configuration (Opt-in)

**What:** Optionally configure Claude Code's experimental agent teams feature. This is a setup-time toggle, not a runtime harness — we generate the config and guidance, Claude Code does the orchestration.

**What gets generated (when opted in):**

1. **`~/.claude/settings.json` environment flag:**
   The wizard prompts "Enable Claude Code agent teams mode? (y/N)" and, if accepted, merges the following into the user's `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

This is a **user-level** setting (not project-level) because agent teams is a Claude Code capability, not a project config. The wizard reads the existing file, merges the `env` key (preserving other settings), and writes it back. If the file doesn't exist, it creates it.

2. **`.claude/rules/agent-teams.md`** (global scope):

```markdown
# Agent Teams Guidance

## When to use teams

- Multiple independent features with no shared files
- Large refactors where subsystems can be worked on in parallel
- Test writing for existing code (each agent handles a different module)

## When NOT to use teams

- Sequential tasks with dependencies
- Database migrations or shared state changes
- Early project setup (one agent is more predictable)

## Team coordination

- Team lead (Opus) coordinates; teammates (Sonnet) execute
- Each teammate works on its own branch
- Teammates should NOT modify the same files
- Use the task tracker to claim tasks and avoid conflicts
```

**Why opt-in:** Agent teams is experimental (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`). It works best for parallelizable work on larger codebases. For typical single-agent workflows (which is most projects during early development), it adds complexity without benefit. The wizard defaults to "skip" and explains when to enable it later.

### F11: Claude Code Bootstrap & Audit

**What:** Install Claude Code early (before the wizard starts) so it can be used in two ways: (1) as an optional assistant during wizard steps, and (2) as a structured auditor in a final verification step that reviews everything the tool just generated.

**Why:** The tool scaffolds dozens of files — CLAUDE.md, rules, skills, hooks, MCP configs, doc templates. A human reviewing all of that manually is tedious and error-prone. Claude Code in headless mode can systematically audit the output in seconds, catching structural issues, missing cross-references, and gaps the user needs to fill. This turns a "hope it's right" moment into a verified handoff.

**Part 1: Early Installation (Step 0)**

Before the wizard begins:

1. Check if `claude` is on PATH
2. If missing: `npm install -g @anthropic-ai/claude-code`
3. Verify with `claude --version`
4. If auth check fails (no API key / no `~/.claude/` credentials): print a warning that audit will be skipped, continue with all other wizard steps

**Part 2: In-Wizard Assistance (Optional)**

During the wizard, Claude Code headless can optionally enhance specific steps:

- **Step 3 (PRD):** After the user fills in their PRD template, offer to run Claude headless to review it for completeness — missing success criteria, vague feature descriptions, no demo-test definitions
- **Step 4 (Architecture):** After architecture selection, Claude can suggest which rules and MCP servers are most relevant for that architecture pattern

This is opt-in per step — the wizard asks "Review with Claude? (Y/n)" and defaults to yes if Claude is available. Each invocation uses a focused, scoped prompt (not open-ended).

**Part 3: Final Audit (Step 9)**

After all files are generated (Steps 1–8), the wizard runs Claude Code in headless mode with a structured audit prompt. The audit is scoped exclusively to files generated during this run.

**Audit manifest:** The wizard tracks every file it creates/modifies during the run in a `generated_files[]` array. This manifest is passed to the audit prompt so Claude reviews only what was just generated — not pre-existing project code.

**Audit prompt (passed to `claude --headless`):**

```
You are auditing the output of the ai-init project bootstrap tool.
Review ONLY the files listed below — these were just generated by the setup wizard.
Do NOT review or comment on any other files in the project.

Generated files:
{{GENERATED_FILES_LIST}}

Audit checklist:
1. STRUCTURE: Are all generated docs following the format defined in docs/doc_format.md?
   Check: TOC present, sections <30 lines, tables used for structured data, TLDR at top.

2. CROSS-REFERENCES: Does CLAUDE.md accurately reference all generated docs?
   Check: Every @import and link points to a file that exists. No broken references.

3. RULES CONSISTENCY: Do .claude/rules/ files reference correct path patterns?
   Check: Path globs in frontmatter match the project's actual directory structure.
   Check: Rules that @import docs reference docs that were actually generated.

4. MCP CONFIG: Is .mcp.json valid JSON with correct package names and args?
   Check: All selected MCP servers are present. No duplicate entries.

5. TEMPLATE COMPLETENESS: Which template sections still have placeholder content
   that the user MUST fill in before agents can work effectively?
   Flag: List each file and the specific sections that need user input.

6. GAPS: What is missing that the user should address manually?
   Flag: Missing docs that would help agents (e.g., no API doc for an API project),
   rules that reference tools not yet installed, skills that assume config not present.

7. PROMPTS & INSTRUCTIONS: Are the agent instructions in CLAUDE.md and rules
   well-structured, specific, and actionable? Flag any that are vague or generic.

Output format:
- ✅ PASS: <area> — <one-line summary>
- ⚠️  FILL: <file>:<section> — <what the user needs to add>
- ❌ FIX: <file>:<issue> — <what's wrong and how to fix it>

End with a "Post-Setup Checklist" — a numbered list of manual actions
the user should take before starting development with an AI agent.
```

**Audit output handling:**

- Results are printed to the terminal as part of Step 10 (Summary)
- Also saved to `.ai-init-audit.md` in the project root for reference
- The file is added to `.gitignore` (it's a transient setup artifact)

**Graceful degradation:**

- If Claude Code is not installed: audit is skipped, wizard prints "Skipping AI audit — Claude Code not available"
- If API auth fails: same skip behavior with message "Skipping AI audit — no API credentials"
- If the audit itself errors: catch the error, print "Audit failed — review generated files manually", continue to summary
- The wizard NEVER fails or blocks because of the audit step

**Cost transparency:** Before running the audit, the wizard prints: "Running AI-powered audit of generated files (this uses your Claude API credits). Skip? (y/N)". Default is to run it.

---

## 6. Architecture

```
ai-helper-tools/
├── src/                        # TypeScript source (F1)
│   ├── cli.ts                  # Entry point + arg parsing
│   ├── wizard.ts               # Interactive prompts
│   ├── registry.ts             # MCP server definitions
│   ├── audit.ts                # Claude Code headless audit runner (F11)
│   ├── phases/                 # Lifecycle handlers
│   ├── generators/             # Pure functions: config → files
│   └── utils.ts                # Shared helpers
├── templates/                  # Document & rule templates (F2, F3)
│   ├── doc_format.md
│   ├── prd.md
│   ├── architecture.md
│   ├── api.md
│   ├── cuj.md
│   ├── onboarding.md
│   ├── adr_template.md
│   ├── testing_strategy.md
│   ├── tasks_simple.md
│   ├── claude_md.md
│   ├── rules/                  # Rule templates (F3)
│   │   ├── general.md
│   │   ├── docs.md
│   │   ├── testing.md
│   │   ├── git.md
│   │   ├── security.md
│   │   ├── api.md
│   │   ├── database.md
│   │   ├── config.md
│   │   └── agent-teams.md
│   ├── skills/                 # Skill templates (F3)
│   │   ├── testing.md
│   │   ├── commit.md
│   │   └── task-workflow.md
│   ├── hooks/                  # Hook scripts (F3)
│   │   └── pre-commit.sh
│   ├── commands/               # Slash command templates (F8)
│   │   ├── dev-next.md
│   │   └── review.md
│   └── boot-prompt.txt         # Claude Code session startup prompt (F8)
├── test/                       # Self-tests (dogfooding F9)
│   ├── generators/             # Unit: pure function assertions
│   ├── integration/            # E2E: runs CLI in temp dir + cleanup
│   └── fixtures/
├── install.sh                  # Single-line bootstrap (ensures Node, clones repo)
├── package.json                # Dependencies + scripts
├── tsconfig.json
├── vitest.config.ts
├── docs/                       # This project's own docs
│   ├── prd.md                  # This file
│   └── research/
└── setup-ai.sh                 # Legacy entry point (calls ai-init)
```

**Design decisions:**

- **TypeScript CLI, bash bootstrap:** The CLI is TypeScript for testability and maintainability. A thin `install.sh` handles bootstrapping Node.js (via fnm) so the user never needs to manually install anything. After install, `ai-init` is a single command on PATH.
- **Generators are pure functions:** Every generator takes a config object and returns `{ path, content }[]`. No filesystem side effects. This makes them trivially testable without mocks or temp dirs.
- **Templates are plain markdown:** No templating engine. Templates use `{{PLACEHOLDER}}` markers that string replacement handles during generation. Simple, debuggable.
- **Self-test dogfooding:** The `test/` folder demonstrates the project's own testing philosophy (F9). Integration tests run the CLI in a temp directory, verify outputs, and clean up — proving the tool works while also serving as a reference for how users should test their own projects.
- **Agent-agnostic docs, Claude-specific instructions:** Documentation templates (F2) work with any AI agent. Agent-specific files (CLAUDE.md, `.claude/rules/`) are generated separately and clearly labeled.
- **No framework:** No oclif, no yeoman, no plugin system. Just TypeScript modules, `@inquirer/prompts` for the wizard, and `meow` for arg parsing. Keeps the codebase small and approachable.

## 7. Development Phases

### Phase 1: TypeScript Foundation & Claude Code Bootstrap

- Scaffold TypeScript project (package.json, tsconfig, vitest)
- Create `install.sh` bootstrap script (fnm + clone + symlink)
- Implement Claude Code installation check and bootstrap (F11 Part 1)
- Port `setup-ai.sh` logic into TypeScript modules (cli.ts, phases/, generators/)
- First generator tests: pure function assertions on output content
- Integration test: run `ai-init` in temp dir, verify files exist, clean up

### Phase 2: Document Scaffolding, Agent Instructions & Testing Strategy

- Create all templates including testing_strategy.md and onboarding.md (F2)
- Implement doc_format.md standard with ADR numbering convention
- Generate `.claude/rules/` with integration-first testing rules (F3, F9)
- Generate `.claude/skills/` — keyword-activated domain knowledge
- Update CLAUDE.md generation to use @imports for docs
- PRD template includes demo-test and acceptance-test fields per feature

### Phase 3: Expanded MCP & Task Tracker

- Add beads-mcp to registry (F4)
- Implement task tracker selection (F5)
- Generate tracker-specific CLAUDE.md instructions
- Simple markdown task file template

### Phase 4: Wizard, Kickstart & Git

- Interactive wizard flow (F6)
- PRD template with editor handoff
- Architecture picker
- Non-interactive env var support
- Git workflow rules generation (F7) — needed before commands that reference git conventions
- Custom Claude commands: `/dev-next` and `/review` (F8, depends on F7 for git rules)
- Pre-commit hook generation (F3 hooks)
- Agent teams opt-in configuration (F10)

### Phase 5: AI Audit & Polish

- Claude Code headless audit step with structured prompt (F11 Parts 2 & 3)
- Generated file manifest tracking for scoped audit
- Audit output rendering and `.ai-init-audit.md` persistence
- End-to-end testing in clean Codespace
- README.md with usage docs
- Record a demo

## 8. Success Criteria

1. A new user can go from empty Codespace to "Claude, start building" in under 5 minutes
2. Generated docs are concise enough that agents load them without context window issues (<200 lines per file)
3. A single `curl | bash` command installs the tool on a clean Linux machine (only bash + curl required)
4. All generated CLAUDE.md instructions are accurate for the chosen task tracker
5. `ai-init` remains idempotent — running it twice produces the same result
6. The wizard can be fully driven by environment variables for CI/automation
7. Generated testing rules steer agents toward integration tests by default; mock usage requires explicit justification
8. PRD template features include demo-test definitions so agents know what "done" looks like
9. Claude Code headless audit runs successfully on generated files and produces actionable findings
10. Audit step degrades gracefully (skip with message) when Claude Code is unavailable or unauthenticated

## 9. Risks

| Risk                                                        | Impact                             | Mitigation                                                                                    |
| ----------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| Too many doc templates overwhelm users                      | Users skip the wizard              | Default to minimal set; wizard clearly marks optional steps                                   |
| Beads API/install changes frequently (active development)   | Broken MCP config                  | Pin to stable release; document manual override                                               |
| Claude Code agent teams feature is experimental             | Generated config may not work      | Gate behind opt-in flag; don't hard-depend on it                                              |
| TypeScript adds Node.js dependency                          | Can't run without Node             | install.sh bootstraps Node via fnm automatically; fnm is a single binary                      |
| Templates go stale as agent best practices evolve           | Docs mislead agents                | Version templates; document update process                                                    |
| Agents ignore testing rules and write mocks anyway          | False test confidence, regressions | Pre-commit hook enforces all tests pass; rules explicitly call out when mocking is acceptable |
| Pre-commit hook blocks when no linter/tests configured      | Frustrating on new projects        | Hook uses `--if-present` flags; silently skips unconfigured steps                             |
| Claude Code headless audit consumes API credits             | Unexpected cost for users          | Explicit cost warning + skip prompt before running audit                                      |
| Claude Code not installed or no API key                     | Audit step fails                   | Graceful skip with clear message; wizard never blocks on audit                                |
| Audit prompt produces inconsistent or hallucinated findings | User acts on bad advice            | Audit prompt is tightly scoped to generated files only; manifest-driven                       |

## 10. Out of Scope

- **npm registry publishing** — the CLI is installed directly from GitHub via `install.sh`, not `npm install -g`. Publishing to npm is a future consideration if adoption grows.
- **Agent teams runtime harness** — Claude Code's `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` feature handles multi-agent orchestration. This tool generates the config flag and guidance rules (F10); it does not run, coordinate, or monitor agent teams.
- **Custom agent creation engine** — generating separate agent personas (security agent, API agent) is unnecessary. Claude Code's `.claude/rules/` with path-scoping achieves the same effect natively: a rule scoped to `src/auth/**` makes Claude behave like a security specialist when editing auth code, without building or running a separate agent. Rules compose automatically — multiple rules load simultaneously when their paths match — so the system scales to any number of domain concerns without orchestration code.
- **Framework-specific templates** — no React, Next.js, Express, etc. boilerplate. The doc templates are framework-agnostic; framework specifics belong in the user's project rules.
- **Gemini / Copilot config generation** — while the doc structure is compatible, we only generate Claude Code-specific files (`.claude/`, `CLAUDE.md`). Cross-agent config generation is a future consideration.
- **AI-driven PRD generation** — the wizard provides templates and opens an editor. Claude Code headless may _review_ a user-written PRD for completeness (F11), but it does not _generate_ the PRD content.
- **Deployment, hosting, or infrastructure config** — this tool sets up the dev environment, not prod.
