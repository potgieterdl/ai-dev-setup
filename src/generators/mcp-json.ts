import type { ProjectConfig, FileDescriptor } from "../types.js";
import { getSelectedServers } from "../registry.js";

interface McpServerEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface VscodeMcpServerEntry extends McpServerEntry {
  cwd: string;
  envFile: string;
  type: "stdio";
}

/**
 * Build the Claude Code `.mcp.json` server map.
 * Root key: "mcpServers". Env values are passed through as-is from the registry.
 */
function buildClaudeCodeMcpConfig(config: ProjectConfig): Record<string, McpServerEntry> {
  const servers = getSelectedServers(config.selectedMcps);
  const result: Record<string, McpServerEntry> = {};

  for (const server of servers) {
    const entry: McpServerEntry = {
      command: "npx",
      args: server.args ?? ["-y", server.npmPackage],
    };

    if (server.env && Object.keys(server.env).length > 0) {
      entry.env = { ...server.env };
    }

    result[server.claudeMcpName] = entry;
  }

  return result;
}

/**
 * Build the VS Code `.vscode/mcp.json` server map.
 * Root key: "servers". Adds `cwd`, `envFile`, `type: "stdio"`,
 * and env vars use `${env:VAR_NAME}` syntax.
 */
function buildVscodeMcpConfig(config: ProjectConfig): Record<string, VscodeMcpServerEntry> {
  const servers = getSelectedServers(config.selectedMcps);
  const result: Record<string, VscodeMcpServerEntry> = {};

  for (const server of servers) {
    const envBlock: Record<string, string> = {};
    for (const key of Object.keys(server.env ?? {})) {
      envBlock[key] = `\${env:${key}}`;
    }

    const entry: VscodeMcpServerEntry = {
      command: "npx",
      args: server.args ?? ["-y", server.npmPackage],
      cwd: "${workspaceFolder}",
      envFile: "${workspaceFolder}/.env",
      type: "stdio",
    };

    if (Object.keys(envBlock).length > 0) {
      entry.env = envBlock;
    }

    result[server.claudeMcpName] = entry;
  }

  return result;
}

/**
 * Generate MCP configuration files for both Claude Code and VS Code/Copilot.
 *
 * Pure function — takes ProjectConfig, returns FileDescriptor[].
 * Always returns exactly 2 file descriptors:
 *   1. `.mcp.json`       — Claude Code format (root key: "mcpServers")
 *   2. `.vscode/mcp.json` — VS Code format (root key: "servers")
 */
export function generateMcpJson(config: ProjectConfig): FileDescriptor[] {
  return [
    {
      path: ".mcp.json",
      content: JSON.stringify({ mcpServers: buildClaudeCodeMcpConfig(config) }, null, 2),
    },
    {
      path: ".vscode/mcp.json",
      content: JSON.stringify({ servers: buildVscodeMcpConfig(config) }, null, 2),
    },
  ];
}
