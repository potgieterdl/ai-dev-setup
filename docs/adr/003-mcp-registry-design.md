# ADR-003: MCP Registry as Single Source of Truth

- **Status:** Accepted
- **Feature:** F4 (MCP Server Configuration)
- **Task:** 3 — Implement MCP Registry and Server Definitions
- **Date:** 2026-02-17

## Context

The CLI needs to generate two MCP config files (`.mcp.json` for Claude Code, `.vscode/mcp.json` for VS Code/Copilot) from the same set of server definitions. Without a centralized registry, server metadata (package names, args, env vars) would be duplicated across generators, risking drift between the two output formats.

The PRD (F4) specifies 5 MCP servers: taskmaster, beads, context7, browsermcp, and sequential-thinking. Each has different npm packages, args, and environment variable requirements.

## Decision

- **Single `MCP_REGISTRY` array** in `src/registry.ts` is the canonical list of all available MCP servers. It uses the `McpServer` interface from `src/types.ts`.
- **Server selection by name** — the `ProjectConfig.selectedMcps` field stores user-chosen server names (strings). The registry provides `getSelectedServers(names)` to resolve names to full `McpServer` objects. This decouples wizard state from registry data.
- **`getMcpByName()` helper** — provides single-server lookup for cases where generators need to check if a specific server is available (e.g., checking taskmaster env vars).
- **Environment variable placeholders** use `${VAR_NAME}` syntax as literal strings, not template literals. Generators will replace these with the appropriate format for each output file (shell env for `.mcp.json`, VS Code `${env:VAR}` syntax for `.vscode/mcp.json`).
- **All servers are `required: false`** — none are mandatory. The wizard drives selection.
- **Args convention** — every server uses `["-y", "<npmPackage>"]` for npx invocation, ensuring non-interactive installs.

## Consequences

- Adding a new MCP server is a single-line addition to `MCP_REGISTRY` — both config generators automatically pick it up.
- The registry is independently testable (15 unit tests) with no filesystem or network dependencies.
- The `env` field uses placeholder strings, so generators must implement format-specific substitution. This adds a small amount of complexity to generators but keeps the registry format-agnostic.
- Trade-off: the registry is a static array, not dynamically discovered. Adding community MCP servers requires a code change. This is acceptable for the current scope (5 known servers) and keeps the system predictable.
