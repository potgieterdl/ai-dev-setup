# ADR-011: Devcontainer Generator with MCP-Driven Secrets

- **Status:** Accepted
- **Feature:** F1 (TypeScript CLI), F6 (Guided Project Kickstart)
- **Task:** 11 — Implement Devcontainer Generator
- **Date:** 2026-02-17

## Context

GitHub Codespaces uses `.devcontainer/devcontainer.json` to configure the development container. The CLI needs to generate this file with lifecycle hooks that call `ai-init` phases, so that opening a Codespace automatically bootstraps the AI development environment. Additionally, MCP servers require API keys that should be configured as Codespace secrets and forwarded into the container environment.

Key requirements:

- Lifecycle hooks must map to `ai-init on-create`, `ai-init post-create`, `ai-init post-start`
- API keys from selected MCP servers should appear as Codespace secrets
- The devcontainer image should include Node.js 20 for the CLI to work
- VS Code extensions for Copilot should be pre-installed

## Decision

- **Pure function pattern** — `generateDevcontainer(config: ProjectConfig): FileDescriptor[]` is a synchronous pure function. No template files needed — the config object is built directly in code, matching the `mcp-json.ts` pattern. This is simpler than the template-based pattern since the output is JSON, not markdown.
- **MCP-driven secrets** — `buildMcpSecrets()` iterates over selected MCP servers and extracts env vars that end in `_KEY`, `_SECRET`, or `_TOKEN`. These are treated as sensitive credentials and added to `secrets`, `containerEnv`, and `remoteEnv`. Non-secret env vars (e.g., `TASK_MASTER_TOOLS`) are excluded.
- **ANTHROPIC_API_KEY always included** — Claude Code needs this key regardless of which MCPs are selected. It's added as a baseline before MCP-specific keys are layered on, with deduplication to prevent the same key appearing twice when taskmaster is selected (which also has ANTHROPIC_API_KEY in its env).
- **`${localEnv:VAR}` syntax** — Codespace env forwarding uses `${localEnv:VAR}` in both `containerEnv` and `remoteEnv`. This is the devcontainer spec standard for forwarding the user's machine environment into the container.
- **Always returns exactly 1 FileDescriptor** — `.devcontainer/devcontainer.json`. Unlike `mcp-json.ts` (which emits 2 files for Claude Code and VS Code formats), the devcontainer spec is universal.
- **Universal base image** — `mcr.microsoft.com/devcontainers/universal:2` with the Node.js 20 feature. This provides a batteries-included environment while ensuring the correct Node version for the CLI.

## Consequences

- Codespace creation automatically triggers `ai-init` phases, giving users a fully bootstrapped AI dev environment without manual steps.
- Adding a new MCP server with API key env vars to the registry will automatically include those keys in the devcontainer secrets — no generator changes needed.
- Trade-off: Only env vars matching the `_KEY`/`_SECRET`/`_TOKEN` suffix pattern are treated as secrets. A server with a non-standard env var name for credentials would be missed. This is acceptable since the convention is well-established and the user can manually add secrets.
- Trade-off: The base image is opinionated (universal:2). Users who need a slimmer image would need to edit the generated file post-setup. This aligns with the tool's philosophy of generating sensible defaults that can be customized.
