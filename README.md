# AI Project Init (`ai-init`)

> Bootstrap tool that turns an empty workspace into an agent-ready development environment. One command installs AI tooling, scaffolds documentation, configures MCP servers, and generates the full `.claude/` directory structure.

## Table of Contents

- [Quick Install](#quick-install)
- [Usage](#usage)
- [What Gets Generated](#what-gets-generated)
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
ai-init on-create          # Codespace lifecycle: heavy installs
ai-init post-create        # Codespace lifecycle: project scaffolding
ai-init post-start         # Codespace lifecycle: per-session setup
```

### Wizard Steps

| Step | Action                  | Description                                |
| ---- | ----------------------- | ------------------------------------------ |
| 0    | Claude Code Bootstrap   | Install Claude Code if missing             |
| 1    | MCP Server Selection    | Choose which MCP servers to configure      |
| 2    | Task Tracker Choice     | TaskMaster, Beads, or Simple Markdown      |
| 3    | PRD Import              | Import existing PRD or use template        |
| 4    | Architecture            | Monolith, 2-tier, 3-tier, or microservices |
| 5    | API Surface             | Scaffold API docs based on architecture    |
| 6    | Database                | Include database rules and docs            |
| 7    | Generation Confirmation | Confirm which files to generate            |
| 8    | Agent Teams (opt-in)    | Enable experimental multi-agent mode       |
| 9    | AI-Powered Audit        | Claude Code reviews generated files        |
| 10   | Summary & Next Steps    | Print what was created and what to do next |

### CLI Flags

| Flag                | Description                              |
| ------------------- | ---------------------------------------- |
| `--non-interactive` | Skip prompts, use environment variables  |
| `--no-audit`        | Skip the Claude Code audit step          |
| `--overwrite`       | Overwrite existing files (default: true) |
| `--version`         | Show version                             |
| `--help`            | Show help text                           |

## What Gets Generated

| File / Directory                  | Purpose                                         |
| --------------------------------- | ----------------------------------------------- |
| `CLAUDE.md`                       | Agent instructions (auto-loaded by Claude Code) |
| `CLAUDE_MCP.md`                   | MCP server documentation for agents             |
| `.mcp.json`                       | MCP servers for Claude Code CLI                 |
| `.vscode/mcp.json`                | MCP servers for VS Code / Copilot               |
| `docs/`                           | Agent-optimized project documentation           |
| `docs/adr/`                       | Architecture Decision Records                   |
| `.claude/rules/`                  | Path-scoped agent rules (auto-compose)          |
| `.claude/skills/`                 | Keyword-activated agent knowledge               |
| `.claude/hooks/pre-commit.sh`     | Pre-commit quality gate                         |
| `.claude/commands/`               | `/dev-next` and `/review` slash commands        |
| `.devcontainer/devcontainer.json` | Codespace lifecycle hooks                       |

## Task Tracker Options

| Option              | Best For                                 | Installs                             |
| ------------------- | ---------------------------------------- | ------------------------------------ |
| **Task Master**     | Full projects with subtasks and research | `task-master-ai` npm + MCP           |
| **Beads**           | Multi-agent, git-native issue tracking   | `@beads/bd` + `beads-mcp`            |
| **Simple Markdown** | Small projects, <= 20 tasks              | Nothing extra — generates `TASKS.md` |

## Environment Variables

All variables are optional. They drive non-interactive mode when `SETUP_AI_NONINTERACTIVE=1`.

| Variable                  | Values                                                                      | Default           |
| ------------------------- | --------------------------------------------------------------------------- | ----------------- |
| `SETUP_AI_NONINTERACTIVE` | `1` to skip all prompts                                                     | `0`               |
| `SETUP_AI_MCPS`           | Comma-separated: `taskmaster,context7,browsermcp,sequential-thinking,beads` | `taskmaster`      |
| `SETUP_AI_TRACKER`        | `taskmaster` \| `beads` \| `markdown`                                       | `taskmaster`      |
| `SETUP_AI_ARCH`           | `monolith` \| `2-tier` \| `3-tier` \| `microservices` \| `skip`             | `skip`            |
| `SETUP_AI_SKIP_AUDIT`     | `1` to skip AI audit step                                                   | `0`               |
| `SETUP_AI_AGENT_TEAMS`    | `1` to enable agent teams                                                   | `0`               |
| `SETUP_AI_PRD_PATH`       | Path to existing PRD file                                                   | —                 |
| `AI_HELPER_HOME`          | Override install directory                                                  | `~/.ai-dev-setup` |

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
├── wizard.ts           # 10-step interactive wizard (@inquirer/prompts)
├── audit.ts            # Claude Code headless audit runner
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

See [docs/adr/](docs/adr/) for architectural decisions.

## License

MIT
