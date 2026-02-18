# ADR-023: Bash to TypeScript CLI Migration Verification

- **Status:** Accepted
- **Context:** The project began as a single-file bash script (`setup-ai.sh`, ~1,400 lines) that bootstraps AI development environments in GitHub Codespaces. As complexity grew (MCP servers, task trackers, document scaffolding, rules, skills, hooks, audit), bash became difficult to test, refactor, and extend. A TypeScript CLI (`ai-init`) was built as a replacement across tasks 1-22.
- **Decision:** Verify that the TypeScript CLI conceptually covers all functionality from `setup-ai.sh`, transition the devcontainer lifecycle hooks from bash to TypeScript, deprecate the bash script, and retain it as a reference.
- **Consequences:**
  - The `.devcontainer/devcontainer.json` now references `ai-init` commands instead of `bash setup-ai.sh`
  - `setup-ai.sh` is preserved with a deprecation notice for reference
  - A dedicated integration test suite (`bash-parity.test.ts`) verifies conceptual equivalence

## Migration Mapping

| Bash Function                   | TypeScript Equivalent                               | Status                |
| ------------------------------- | --------------------------------------------------- | --------------------- |
| `select_mcps()`                 | `wizard.ts` Step 1 + env var handling               | Complete              |
| `validate_selected_mcps()`      | `registry.ts:getSelectedServers()`                  | Complete              |
| `generate_mcp_json()`           | `generators/mcp-json.ts:generateMcpJson()`          | Complete              |
| `generate_vscode_mcp_json()`    | `generators/mcp-json.ts:generateMcpJson()`          | Complete              |
| `generate_claude_md()`          | `generators/claude-md.ts:generateClaudeMd()`        | Complete              |
| `generate_claude_mcp_md()`      | `generators/claude-md.ts:generateClaudeMd()`        | Complete              |
| `generate_devcontainer()`       | `generators/devcontainer.ts:generateDevcontainer()` | Complete              |
| `configure_claude_settings()`   | `generators/hooks.ts:generateHooks()`               | Complete              |
| `scaffold_prd()`                | `generators/docs.ts:generateDocs()`                 | Complete (enhanced)   |
| `generate_boot_prompt()`        | `generators/commands.ts:generateCommands()`         | Complete              |
| `phase_on_create()`             | `phases/on-create.ts:runOnCreate()`                 | Complete              |
| `phase_post_create()`           | `phases/post-create.ts:runPostCreate()`             | Complete              |
| `phase_post_start()`            | `phases/post-start.ts:runPostStart()`               | Complete              |
| `generate_env_file()`           | `phases/post-start.ts:syncEnvFile()`                | Complete              |
| `print_welcome_banner()`        | `phases/post-start.ts:runPostStart()`               | Complete              |
| `configure_taskmaster_models()` | N/A — Task Master MCP handles model config          | Intentionally omitted |
| `inject_shell_config()`         | N/A — CLI is on PATH, no bashrc wrapper needed      | Intentionally omitted |
| MCP package pre-caching         | N/A — npx handles caching automatically             | Intentionally omitted |

## TypeScript Enhancements (Not in Bash)

- Document scaffolding (F2): Full `docs/` template set with `doc_format.md` standard
- Path-scoped rules (F3): `.claude/rules/` with YAML frontmatter
- Skills generation (F3): `.claude/skills/` keyword-activated knowledge
- Hooks generation (F3): `.claude/hooks/pre-commit.sh` quality gate
- Commands generation (F8): `/dev-next` and `/review` slash commands
- Agent teams config (F10): Opt-in `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`
- Claude Code audit (F11): Headless audit of generated files
- Beads MCP (F4): Added to registry for git-backed issue tracking
- Task tracker selection (F5): TaskMaster / Beads / Simple Markdown

## Intentionally Omitted from TypeScript

1. **`inject_shell_config()`** — The bash script injected a Claude wrapper function into `~/.bashrc` for boot guidance. The TypeScript CLI is installed as a global binary on PATH, and boot guidance is handled by `.claude/boot-prompt.txt` natively. No bashrc modification is needed.

2. **`configure_taskmaster_models()`** — The bash script ran `task-master models --set-main sonnet ...` directly. Task Master's MCP server handles model configuration at runtime. Codespace secrets provide API keys.

3. **MCP package pre-caching** — The bash script ran `npm cache add` for all MCP packages during `on-create`. The TypeScript `on-create` installs Claude Code and Task Master globally; other MCP packages are fetched by `npx` on first use, which is fast enough.

## Verification Approach

- Integration test `test/integration/bash-parity.test.ts` covers:
  - MCP registry parity (all 4 original MCPs present with correct packages)
  - `.mcp.json` and `.vscode/mcp.json` format parity
  - CLAUDE.md and CLAUDE_MCP.md content parity
  - Devcontainer lifecycle commands reference `ai-init`
  - Post-start welcome banner with task progress
  - Non-interactive mode via `SETUP_AI_NONINTERACTIVE` and `SETUP_AI_MCPS`
  - TS enhancements verified as additions (not regressions)
