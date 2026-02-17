# ADR-007: Dual-Format MCP Configuration Generator

- **Status:** Accepted
- **Feature:** F4 (MCP Server Configuration)
- **Task:** 7 — Implement MCP Configuration Generator
- **Date:** 2026-02-17

## Context

Claude Code and VS Code/Copilot use different JSON schemas for MCP server registration. The CLI must generate both formats from the same `ProjectConfig` to ensure MCP servers work regardless of the user's tool choice. The MCP registry (Task 3, ADR-003) provides the canonical server definitions; this generator transforms them into the two required output formats.

Key differences between the two formats:

- `.mcp.json`: root key `"mcpServers"`, env values passed through as-is from registry
- `.vscode/mcp.json`: root key `"servers"`, adds `cwd: "${workspaceFolder}"`, `envFile`, `type: "stdio"`, and env vars use `${env:VAR_NAME}` syntax

## Decision

- **Pure function pattern** — `generateMcpJson(config: ProjectConfig): FileDescriptor[]` takes config in and returns file descriptors out. No filesystem access, no side effects. This follows the generator contract established for all generators in this project.
- **Two internal builder functions** — `buildClaudeCodeMcpConfig()` and `buildVscodeMcpConfig()` are private (not exported). Each handles format-specific transformation. This separation keeps the format logic isolated and testable through the public API.
- **Env var handling strategy**:
  - Claude Code format: env values are passed through directly from the registry (e.g., `"${ANTHROPIC_API_KEY}"`).
  - VS Code format: env keys are transformed to `${env:KEY}` syntax. This is the VS Code convention for referencing environment variables.
  - Servers with empty `env` objects (e.g., beads, context7) have the `env` field omitted entirely from output to keep configs clean.
- **Always returns exactly 2 FileDescriptors** — `.mcp.json` and `.vscode/mcp.json`. Consumers can rely on this contract.
- **Unknown server names are silently ignored** — `getSelectedServers()` from the registry already handles this by filtering. No error is thrown for names not in the registry.

## Consequences

- Both config files are generated atomically from the same input, ensuring they stay in sync.
- Adding a new MCP server to the registry automatically propagates to both output formats with no generator changes needed.
- The env var transformation is one-directional (registry → output format). If a user needs custom env var handling, they'd edit the generated files post-setup. This is acceptable since the tool handles setup only.
- Trade-off: VS Code `${env:VAR}` syntax is string-interpolated at generation time, not validated. If a registry entry has a typo in an env key, it propagates to both files. The registry tests (Task 3) mitigate this by verifying known env vars.
