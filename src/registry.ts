import type { McpServer } from "./types.js";

/**
 * MCP Server Registry — single source of truth for all MCP server definitions.
 * Drives both .mcp.json (Claude Code) and .vscode/mcp.json (VS Code/Copilot) generation.
 *
 * Each entry maps to a server that can be selected during the wizard (F4/F6).
 * The registry is consumed by generators/mcp-json.ts to produce config files.
 */
export const MCP_REGISTRY: McpServer[] = [
  {
    name: "taskmaster",
    description:
      "Task Master AI — task orchestration, dependency tracking, multi-agent coordination",
    npmPackage: "task-master-ai",
    claudeMcpName: "taskmaster-ai",
    required: false,
    args: ["-y", "task-master-ai"],
    env: {
      TASK_MASTER_TOOLS: "all",
      ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY}",
      PERPLEXITY_API_KEY: "${PERPLEXITY_API_KEY}",
    },
  },
  {
    name: "beads",
    description:
      "Beads — distributed git-backed issue tracking for multi-agent workflows",
    npmPackage: "beads-mcp",
    claudeMcpName: "beads",
    required: false,
    args: ["-y", "beads-mcp"],
    env: {},
  },
  {
    name: "context7",
    description: "Context7 — up-to-date library docs and code examples via MCP",
    npmPackage: "@upstash/context7-mcp",
    claudeMcpName: "context7",
    required: false,
    args: ["-y", "@upstash/context7-mcp"],
    env: {},
  },
  {
    name: "browsermcp",
    description:
      "BrowserMCP — browser automation for testing (navigate, click, screenshots)",
    npmPackage: "@anthropic-ai/mcp-server-puppeteer",
    claudeMcpName: "browsermcp",
    required: false,
    args: ["-y", "@anthropic-ai/mcp-server-puppeteer"],
    env: {},
  },
  {
    name: "sequential-thinking",
    description:
      "Sequential Thinking — dynamic problem-solving through thought sequences",
    npmPackage: "@anthropic-ai/mcp-server-sequential-thinking",
    claudeMcpName: "sequential-thinking",
    required: false,
    args: ["-y", "@anthropic-ai/mcp-server-sequential-thinking"],
    env: {},
  },
];

/** Look up a single MCP server by its registry name. */
export function getMcpByName(name: string): McpServer | undefined {
  return MCP_REGISTRY.find((s) => s.name === name);
}

/** Filter the registry to only servers matching the given names. */
export function getSelectedServers(selectedNames: string[]): McpServer[] {
  return MCP_REGISTRY.filter((s) => selectedNames.includes(s.name));
}
