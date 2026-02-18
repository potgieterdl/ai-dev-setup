import { describe, it, expect } from "vitest";
import { generateMcpJson } from "../../src/generators/mcp-json.js";
import { defaultConfig } from "../../src/defaults.js";

function makeConfig(overrides: Partial<ReturnType<typeof defaultConfig>> = {}) {
  return { ...defaultConfig("/tmp/test-project"), ...overrides };
}

describe("generateMcpJson", () => {
  it("smoke: returns exactly 2 FileDescriptors", () => {
    const result = generateMcpJson(makeConfig());
    expect(result).toHaveLength(2);
  });

  it("smoke: returns .mcp.json as first file and .vscode/mcp.json as second", () => {
    const result = generateMcpJson(makeConfig());
    expect(result[0].path).toBe(".mcp.json");
    expect(result[1].path).toBe(".vscode/mcp.json");
  });

  it("smoke: produces valid JSON for both files", () => {
    const result = generateMcpJson(makeConfig());
    for (const file of result) {
      expect(() => JSON.parse(file.content)).not.toThrow();
    }
  });

  describe(".mcp.json (Claude Code format)", () => {
    it("demo: uses mcpServers as root key for Claude Code", () => {
      const result = generateMcpJson(makeConfig());
      const parsed = JSON.parse(result[0].content);
      expect(parsed).toHaveProperty("mcpServers");
      expect(Object.keys(parsed)).toEqual(["mcpServers"]);
    });

    it("demo: taskmaster config includes taskmaster-ai entry", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[0].content);
      expect(parsed.mcpServers).toHaveProperty("taskmaster-ai");
    });

    it("demo: taskmaster entry has correct npx command and args", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[0].content);
      const tm = parsed.mcpServers["taskmaster-ai"];
      expect(tm.command).toBe("npx");
      expect(tm.args).toEqual(["-y", "task-master-ai"]);
    });

    it("demo: taskmaster entry includes env vars as-is from registry", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[0].content);
      const tm = parsed.mcpServers["taskmaster-ai"];
      expect(tm.env).toBeDefined();
      expect(tm.env.TASK_MASTER_TOOLS).toBe("all");
      expect(tm.env.ANTHROPIC_API_KEY).toBe("${ANTHROPIC_API_KEY}");
      expect(tm.env.PERPLEXITY_API_KEY).toBe("${PERPLEXITY_API_KEY}");
    });

    it("demo: Claude Code format does NOT include cwd field", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[0].content);
      const tm = parsed.mcpServers["taskmaster-ai"];
      expect(tm).not.toHaveProperty("cwd");
    });

    it("demo: servers with no env vars omit env block", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["context7"] }));
      const parsed = JSON.parse(result[0].content);
      const server = parsed.mcpServers["context7"];
      expect(server).not.toHaveProperty("env");
    });

    it("demo: multiple selected MCPs produce multiple entries", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster", "beads"] }));
      const parsed = JSON.parse(result[0].content);
      expect(Object.keys(parsed.mcpServers)).toHaveLength(2);
      expect(parsed.mcpServers).toHaveProperty("taskmaster-ai");
      expect(parsed.mcpServers).toHaveProperty("beads");
    });

    it("smoke: empty MCP selection returns empty mcpServers", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: [] }));
      const parsed = JSON.parse(result[0].content);
      expect(Object.keys(parsed.mcpServers)).toHaveLength(0);
    });
  });

  describe(".vscode/mcp.json (VS Code format)", () => {
    it("demo: VS Code config uses servers as root key", () => {
      const result = generateMcpJson(makeConfig());
      const parsed = JSON.parse(result[1].content);
      expect(parsed).toHaveProperty("servers");
      expect(Object.keys(parsed)).toEqual(["servers"]);
    });

    it("demo: VS Code format includes cwd with ${workspaceFolder}", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[1].content);
      const tm = parsed.servers["taskmaster-ai"];
      expect(tm.cwd).toBe("${workspaceFolder}");
    });

    it("demo: VS Code format includes envFile with ${workspaceFolder}/.env", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[1].content);
      const tm = parsed.servers["taskmaster-ai"];
      expect(tm.envFile).toBe("${workspaceFolder}/.env");
    });

    it("demo: VS Code format includes type stdio", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[1].content);
      const tm = parsed.servers["taskmaster-ai"];
      expect(tm.type).toBe("stdio");
    });

    it("demo: VS Code env values use ${env:VAR_NAME} format", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[1].content);
      const tm = parsed.servers["taskmaster-ai"];
      expect(tm.env).toBeDefined();
      expect(tm.env.ANTHROPIC_API_KEY).toBe("${env:ANTHROPIC_API_KEY}");
      expect(tm.env.PERPLEXITY_API_KEY).toBe("${env:PERPLEXITY_API_KEY}");
      expect(tm.env.TASK_MASTER_TOOLS).toBe("${env:TASK_MASTER_TOOLS}");
    });

    it("demo: VS Code format omits env block for servers with no env vars", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["beads"] }));
      const parsed = JSON.parse(result[1].content);
      const server = parsed.servers["beads"];
      expect(server).not.toHaveProperty("env");
    });

    it("demo: VS Code format includes multiple servers when selected", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster", "beads"] }));
      const parsed = JSON.parse(result[1].content);
      expect(Object.keys(parsed.servers)).toHaveLength(2);
      expect(parsed.servers).toHaveProperty("taskmaster-ai");
      expect(parsed.servers).toHaveProperty("beads");
    });
  });

  describe("all five registry servers", () => {
    it("demo: all 5 MCP servers generate entries in both formats", () => {
      const allMcps = ["taskmaster", "beads", "context7", "browsermcp", "sequential-thinking"];
      const result = generateMcpJson(makeConfig({ selectedMcps: allMcps }));

      const claudeCode = JSON.parse(result[0].content);
      const vscode = JSON.parse(result[1].content);

      expect(Object.keys(claudeCode.mcpServers)).toHaveLength(5);
      expect(Object.keys(vscode.servers)).toHaveLength(5);

      // Both should have the same server names
      expect(Object.keys(claudeCode.mcpServers).sort()).toEqual(Object.keys(vscode.servers).sort());
    });

    it("demo: server names map to claudeMcpName correctly", () => {
      const allMcps = ["taskmaster", "beads", "context7", "browsermcp", "sequential-thinking"];
      const result = generateMcpJson(makeConfig({ selectedMcps: allMcps }));
      const parsed = JSON.parse(result[0].content);

      expect(parsed.mcpServers).toHaveProperty("taskmaster-ai");
      expect(parsed.mcpServers).toHaveProperty("beads");
      expect(parsed.mcpServers).toHaveProperty("context7");
      expect(parsed.mcpServers).toHaveProperty("browsermcp");
      expect(parsed.mcpServers).toHaveProperty("sequential-thinking");
    });
  });

  describe("ignores unknown server names", () => {
    it("demo: unknown server names are silently skipped", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster", "nonexistent"] }));
      const parsed = JSON.parse(result[0].content);
      expect(Object.keys(parsed.mcpServers)).toHaveLength(1);
      expect(parsed.mcpServers).toHaveProperty("taskmaster-ai");
    });
  });
});
