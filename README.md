# AI Project Init (`ai-init`)

> Bootstrap tool that turns an empty workspace into an agent-ready development environment. Auto-detects your project's language, package manager, and architecture. One command installs AI tooling, scaffolds documentation, configures MCP servers, and generates the full `.claude/` directory structure.

## Table of Contents

- [Quick Install](#quick-install)
- [Usage](#usage)
- [What Gets Generated](#what-gets-generated)
- [Preset System](#preset-system)
- [Language & Package Manager Detection](#language--package-manager-detection)
- [AI-Powered Project Analysis](#ai-powered-project-analysis)
- [Task Tracker Options](#task-tracker-options)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Architecture](#architecture)
- [License](#license)

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/potgieterdl/ai-dev-setup/main/install.sh | bash
```

The installer ensures Node.js >= 20 is available (installs via [fnm](https://fnm.vercel.app/) if missing), clones the repo to `~/.ai-dev-setup`, builds, and symlinks `ai-init` onto your PATH.

## Usage

```bash
cd my-project
ai-init                    # Interactive setup wizard
ai-init --non-interactive  # Env-var driven, no prompts
ai-init --preset=standard  # Apply a preset (skip wizard)
ai-init on-create          # Codespace lifecycle: heavy installs
ai-init post-create        # Codespace lifecycle: project scaffolding
ai-init post-start         # Codespace lifecycle: per-session setup
ai-init update             # Incrementally reconfigure after initial setup
ai-init doctor             # Validate AI dev environment setup
ai-init presets            # List, export, or import presets
```

### Wizard Steps

The interactive wizard walks through project setup sequentially. Each step can be skipped. Auto-detection steps run silently unless override is needed.

| Step | Action                | Description                                         |
| ---- | --------------------- | --------------------------------------------------- |
| 0    | Claude Code Bootstrap | Install Claude Code if missing                      |
| 0.5  | Authentication Gate   | Check Claude auth for AI analysis (F20)             |
| —    | Package Manager       | Auto-detect npm/pnpm/yarn/bun (F15)                 |
| —    | Language Detection    | Auto-detect Node.js/Python/Go/Rust (F19)            |
| —    | AI Analysis           | Claude Haiku scans existing codebases (F20, opt-in) |
| 1    | Preset or Manual      | Start from a preset or configure step-by-step (F18) |
| 2    | MCP Server Selection  | Choose which MCP servers to configure               |
| 3    | Task Tracker Choice   | TaskMaster, Beads, or Simple Markdown               |
| 4    | PRD Import            | Import existing PRD or use template                 |
| 5    | Architecture          | Monolith, 2-tier, 3-tier, or microservices          |
| 6    | API Surface           | Scaffold API docs based on architecture             |
| 7    | Database              | Include database rules and docs                     |
| 8    | Rules Picker          | Choose which rule categories to generate (F13)      |
| 9    | Hooks Picker          | Choose pre-commit quality gate steps (F13)          |
| 10   | Skills Picker         | Choose which skills to generate (F13)               |
| 11   | Agent Teams (opt-in)  | Enable experimental multi-agent mode                |
| 12   | AI-Powered Audit      | Claude Code reviews generated files                 |
| 13   | Summary & Next Steps  | Print what was created and what to do next          |

### CLI Flags

| Flag                   | Description                                 |
| ---------------------- | ------------------------------------------- |
| `--non-interactive`    | Skip prompts, use environment variables     |
| `--no-audit`           | Skip the Claude Code audit step             |
| `--overwrite`          | Overwrite existing files (default: true)    |
| `--pm <name>`          | Force package manager: npm, pnpm, yarn, bun |
| `--preset <name>`      | Apply a preset and skip the wizard (F18)    |
| `--save-preset <name>` | Save wizard choices as a named preset (F18) |
| `--version`            | Show version                                |
| `--help`               | Show help text                              |

### `ai-init update`

Incrementally reconfigure after initial setup. Reads `.ai-init.json`, diffs against previous config, backs up affected files, and regenerates only what changed.

**Interactive mode** — run `ai-init update` with no flags to get a dashboard showing current config and change options.

**Non-interactive mode** — use CLI flags:

| Flag                   | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `--add-mcp=<name>`     | Add an MCP server                                 |
| `--remove-mcp=<name>`  | Remove an MCP server                              |
| `--tracker=<name>`     | Switch task tracker (taskmaster, beads, markdown) |
| `--add-rule=<name>`    | Add a rule category                               |
| `--remove-rule=<name>` | Remove a rule category                            |
| `--enable-teams`       | Enable agent teams                                |
| `--disable-teams`      | Disable agent teams                               |
| `--pm <name>`          | Change package manager                            |

### `ai-init doctor`

Validates the current AI dev environment by running categorized health checks:

| Category               | Checks                                                            |
| ---------------------- | ----------------------------------------------------------------- |
| **MCP Configuration**  | Valid JSON, all servers have required fields, API keys set        |
| **Agent Instructions** | CLAUDE.md exists, not too large, cross-references resolve         |
| **Rules & Skills**     | Files exist, YAML frontmatter valid, `@import` references resolve |
| **Hooks**              | Scripts exist, are executable, settings.json matchers valid       |
| **Task Tracker**       | Configured tracker is set up, task files exist and parse          |
| **Documentation**      | Template placeholders filled, no broken links                     |
| **Dependencies**       | Required npm globals installed (claude, task-master, npx)         |

Exit codes: `0` = all checks pass (warnings OK), `1` = one or more errors.

```bash
# CI integration
ai-init doctor || echo "AI dev env needs attention"
```

### `ai-init presets`

Manage preset configurations — save, load, export, and import named wizard states.

```bash
ai-init presets                       # List all presets
ai-init presets --export=standard     # Export preset to stdout as JSON
ai-init presets --import=config.json  # Import a preset from JSON file
```

## What Gets Generated

| File / Directory                  | Purpose                                         |
| --------------------------------- | ----------------------------------------------- |
| `CLAUDE.md`                       | Agent instructions (auto-loaded by Claude Code) |
| `CLAUDE_MCP.md`                   | MCP server documentation for agents             |
| `.mcp.json`                       | MCP servers for Claude Code CLI                 |
| `.vscode/mcp.json`                | MCP servers for VS Code / Copilot               |
| `.ai-init.json`                   | Persisted wizard state for incremental updates  |
| `docs/`                           | Agent-optimized project documentation           |
| `docs/adr/`                       | Architecture Decision Records                   |
| `.claude/rules/`                  | Path-scoped agent rules (auto-compose)          |
| `.claude/skills/`                 | Keyword-activated agent knowledge               |
| `.claude/hooks/pre-commit.sh`     | Pre-commit quality gate                         |
| `.claude/settings.json`           | Hook matchers and tool allowlist                |
| `.claude/commands/`               | `/dev-next` and `/review` slash commands        |
| `.devcontainer/devcontainer.json` | Codespace lifecycle hooks                       |

## Preset System

Pre-defined and custom wizard configurations for fast, repeatable setups.

### Built-in Presets

| Preset     | Description                                                              |
| ---------- | ------------------------------------------------------------------------ |
| `minimal`  | Quick start — TaskMaster MCP, markdown tracker, 2 rules, no hooks/skills |
| `standard` | Recommended — TaskMaster + Context7, 5 rules, all hooks and skills       |
| `full`     | Everything — all 5 MCPs, all rules, all hooks, agent teams enabled       |

### Using Presets

```bash
# Apply a preset (skips the wizard entirely)
ai-init --preset=standard

# Save your wizard selections as a reusable preset
ai-init --save-preset=my-team-config

# Export/import for sharing across machines
ai-init presets --export=my-team-config > preset.json
ai-init presets --import=preset.json
```

## Language & Package Manager Detection

The wizard auto-detects your project's language and package manager before the first interactive step.

### Supported Languages

| Language | Detection Signals                                | Toolchain Commands                                       |
| -------- | ------------------------------------------------ | -------------------------------------------------------- |
| Node.js  | `package.json`, `tsconfig.json`                  | Uses detected package manager                            |
| Python   | `pyproject.toml`, `requirements.txt`, `setup.py` | `black`, `ruff`, `mypy`, `pytest`                        |
| Go       | `go.mod`                                         | `gofmt`, `golangci-lint`, `go build`, `go test`          |
| Rust     | `Cargo.toml`                                     | `cargo fmt`, `cargo clippy`, `cargo build`, `cargo test` |

### Supported Package Managers

| Manager | Lock File                | Commands                   |
| ------- | ------------------------ | -------------------------- |
| npm     | `package-lock.json`      | `npx`, `npm run`, `npm ci` |
| pnpm    | `pnpm-lock.yaml`         | `pnpm dlx`, `pnpm run`     |
| yarn    | `yarn.lock`              | `yarn dlx`, `yarn run`     |
| bun     | `bun.lock` / `bun.lockb` | `bunx`, `bun run`          |

Detection priority: lock file > `packageManager` field in `package.json` > npm fallback.

Override with `--pm <name>` or `SETUP_AI_PM` env var.

## AI-Powered Project Analysis

For **existing projects** with Claude authentication enabled, the wizard offers an AI-powered analysis step that scans your codebase and pre-fills configuration:

1. **Detect** — Scans filesystem for architecture signals (directories, frameworks, ORMs, configs)
2. **Synthesize** — Calls Claude Haiku with detection results and a JSON schema constraint
3. **Validate** — Validates the response against a Zod schema; retries once if invalid
4. **Apply** — Populates wizard config with detected architecture, rules, hooks, API paths, and DB paths

The analysis determines architecture type, recommends rules based on detected frameworks, and generates a short architecture description for CLAUDE.md.

Analysis failures (no Claude auth, timeouts, invalid responses) fall back to manual configuration silently. The wizard never blocks on this step.

## Task Tracker Options

| Option              | Best For                                 | Installs                             |
| ------------------- | ---------------------------------------- | ------------------------------------ |
| **Task Master**     | Full projects with subtasks and research | `task-master-ai` npm + MCP           |
| **Beads**           | Multi-agent, git-native issue tracking   | `@beads/bd` + `beads-mcp`            |
| **Simple Markdown** | Small projects, <= 20 tasks              | Nothing extra — generates `TASKS.md` |

## Environment Variables

All variables are optional. They drive non-interactive mode when `SETUP_AI_NONINTERACTIVE=1`.

| Variable                    | Values                                                                      | Default           |
| --------------------------- | --------------------------------------------------------------------------- | ----------------- |
| `SETUP_AI_NONINTERACTIVE`   | `1` to skip all prompts                                                     | `0`               |
| `SETUP_AI_MCPS`             | Comma-separated: `taskmaster,context7,browsermcp,sequential-thinking,beads` | `taskmaster`      |
| `SETUP_AI_TRACKER`          | `taskmaster` \| `beads` \| `markdown`                                       | `taskmaster`      |
| `SETUP_AI_ARCH`             | `monolith` \| `2-tier` \| `3-tier` \| `microservices` \| `skip`             | `skip`            |
| `SETUP_AI_SKIP_AUDIT`       | `1` to skip AI audit step                                                   | `0`               |
| `SETUP_AI_AGENT_TEAMS`      | `1` to enable agent teams                                                   | `0`               |
| `SETUP_AI_PRD_PATH`         | Path to existing PRD file                                                   | —                 |
| `SETUP_AI_PM`               | `npm` \| `pnpm` \| `yarn` \| `bun`                                          | auto-detected     |
| `SETUP_AI_LANGUAGE`         | `node` \| `python` \| `go` \| `rust` \| `unknown`                           | auto-detected     |
| `SETUP_AI_RULES`            | Comma-separated: `general,docs,testing,git,security,config,api,database`    | All               |
| `SETUP_AI_HOOKS`            | Comma-separated: `format,lint,typecheck,build,test`                         | All               |
| `SETUP_AI_SKILLS`           | Comma-separated: `testing,commit,task-workflow`                             | All               |
| `SETUP_AI_PRESET`           | Preset name for non-interactive mode                                        | —                 |
| `SETUP_AI_EXISTING_PROJECT` | `1` to trigger AI analysis for existing projects                            | `0`               |
| `AI_HELPER_HOME`            | Override install directory                                                  | `~/.ai-dev-setup` |

## Development

```bash
git clone https://github.com/potgieterdl/ai-dev-setup.git
cd ai-dev-setup
npm ci
npm run build
npm test
```

### Available Scripts

| Script              | Purpose                        |
| ------------------- | ------------------------------ |
| `npm run build`     | Compile TypeScript             |
| `npm run dev`       | Run with tsx (no build needed) |
| `npm test`          | Run tests (Vitest)             |
| `npm run lint`      | Lint and auto-fix (ESLint)     |
| `npm run typecheck` | Type-check without emitting    |
| `npm run format`    | Format code (Prettier)         |

### Project Structure

```
src/
├── cli.ts              # Entry point + argument parsing (meow)
├── wizard.ts           # Interactive wizard (@inquirer/prompts)
├── audit.ts            # Claude Code headless audit runner
├── doctor.ts           # Health check & validation (ai-init doctor)
├── update.ts           # Incremental reconfiguration (ai-init update)
├── presets.ts          # Preset/profile system — save, load, export, import
├── pm.ts               # Package manager detection & abstraction
├── toolchain.ts        # Language detection & toolchain command builder
├── detect.ts           # Filesystem signal scanning for AI analysis
├── analyze.ts          # Claude Haiku-powered project analysis
├── types.ts            # Core TypeScript types
├── defaults.ts         # Default ProjectConfig values
├── registry.ts         # MCP server definitions
├── utils.ts            # Shared helpers
├── generators/         # Pure functions: config -> FileDescriptor[]
│   ├── claude-md.ts    # CLAUDE.md + CLAUDE_MCP.md
│   ├── mcp-json.ts     # .mcp.json + .vscode/mcp.json
│   ├── docs.ts         # Documentation templates
│   ├── rules.ts        # .claude/rules/
│   ├── skills.ts       # .claude/skills/
│   ├── hooks.ts        # .claude/hooks/
│   ├── commands.ts     # .claude/commands/
│   ├── devcontainer.ts # .devcontainer/
│   └── agent-teams.ts  # Agent teams config
└── phases/             # Lifecycle handlers
    ├── on-create.ts    # npm globals
    ├── post-create.ts  # Project scaffolding
    └── post-start.ts   # Per-session setup
```

## Architecture

Generators are **pure functions** — they take a `ProjectConfig` in and return `FileDescriptor[]` out. No filesystem side effects. A single `writeFiles()` utility handles all I/O. This makes every generator trivially testable without mocks or temp dirs.

```typescript
// Example: every generator follows this pattern
function generateX(config: ProjectConfig): FileDescriptor[] {
  return [{ path: "some/file", content: "..." }];
}
```

The toolchain layer (F15, F19) ensures generated output uses correct commands for the detected language and package manager. Hooks, rules, docs, and CLAUDE.md all reference toolchain variables instead of hardcoded npm commands.

See [docs/adr/](docs/adr/) for architectural decisions.

## License

MIT
