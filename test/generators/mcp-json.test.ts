import { describe, it, expect } from "vitest";
import { generateMcpJson } from "../../src/generators/mcp-json.js";
import { defaultConfig } from "../../src/defaults.js";

function makeConfig(overrides: Partial<ReturnType<typeof defaultConfig>> = {}) {
  return { ...defaultConfig("/tmp/test-project"), ...overrides };
}

describe("generateMcpJson", () => {
  it("returns exactly 2 FileDescriptors", () => {
    const result = generateMcpJson(makeConfig());
    expect(result).toHaveLength(2);
  });

  it("returns .mcp.json as first file and .vscode/mcp.json as second", () => {
    const result = generateMcpJson(makeConfig());
    expect(result[0].path).toBe(".mcp.json");
    expect(result[1].path).toBe(".vscode/mcp.json");
  });

  it("produces valid JSON for both files", () => {
    const result = generateMcpJson(makeConfig());
    for (const file of result) {
      expect(() => JSON.parse(file.content)).not.toThrow();
    }
  });

  describe(".mcp.json (Claude Code format)", () => {
    it("uses 'mcpServers' as root key", () => {
      const result = generateMcpJson(makeConfig());
      const parsed = JSON.parse(result[0].content);
      expect(parsed).toHaveProperty("mcpServers");
      expect(Object.keys(parsed)).toEqual(["mcpServers"]);
    });

    it("includes taskmaster-ai when taskmaster is selected", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[0].content);
      expect(parsed.mcpServers).toHaveProperty("taskmaster-ai");
    });

    it("includes correct command and args for taskmaster", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[0].content);
      const tm = parsed.mcpServers["taskmaster-ai"];
      expect(tm.command).toBe("npx");
      expect(tm.args).toEqual(["-y", "task-master-ai"]);
    });

    it("includes env vars as-is from registry for taskmaster", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[0].content);
      const tm = parsed.mcpServers["taskmaster-ai"];
      expect(tm.env).toBeDefined();
      expect(tm.env.TASK_MASTER_TOOLS).toBe("all");
      expect(tm.env.ANTHROPIC_API_KEY).toBe("${ANTHROPIC_API_KEY}");
      expect(tm.env.PERPLEXITY_API_KEY).toBe("${PERPLEXITY_API_KEY}");
    });

    it("does NOT include cwd field", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[0].content);
      const tm = parsed.mcpServers["taskmaster-ai"];
      expect(tm).not.toHaveProperty("cwd");
    });

    it("omits env block for servers with no env vars", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["context7"] }));
      const parsed = JSON.parse(result[0].content);
      const server = parsed.mcpServers["context7"];
      expect(server).not.toHaveProperty("env");
    });

    it("includes multiple servers when multiple are selected", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster", "beads"] }));
      const parsed = JSON.parse(result[0].content);
      expect(Object.keys(parsed.mcpServers)).toHaveLength(2);
      expect(parsed.mcpServers).toHaveProperty("taskmaster-ai");
      expect(parsed.mcpServers).toHaveProperty("beads");
    });

    it("returns empty mcpServers for empty selection", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: [] }));
      const parsed = JSON.parse(result[0].content);
      expect(Object.keys(parsed.mcpServers)).toHaveLength(0);
    });
  });

  describe(".vscode/mcp.json (VS Code format)", () => {
    it("uses 'servers' as root key", () => {
      const result = generateMcpJson(makeConfig());
      const parsed = JSON.parse(result[1].content);
      expect(parsed).toHaveProperty("servers");
      expect(Object.keys(parsed)).toEqual(["servers"]);
    });

    it("includes cwd field with ${workspaceFolder}", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[1].content);
      const tm = parsed.servers["taskmaster-ai"];
      expect(tm.cwd).toBe("${workspaceFolder}");
    });

    it("includes envFile field with ${workspaceFolder}/.env", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[1].content);
      const tm = parsed.servers["taskmaster-ai"];
      expect(tm.envFile).toBe("${workspaceFolder}/.env");
    });

    it("includes type: 'stdio'", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[1].content);
      const tm = parsed.servers["taskmaster-ai"];
      expect(tm.type).toBe("stdio");
    });

    it("env values use ${env:VAR_NAME} format", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[1].content);
      const tm = parsed.servers["taskmaster-ai"];
      expect(tm.env).toBeDefined();
      expect(tm.env.ANTHROPIC_API_KEY).toBe("${env:ANTHROPIC_API_KEY}");
      expect(tm.env.PERPLEXITY_API_KEY).toBe("${env:PERPLEXITY_API_KEY}");
      expect(tm.env.TASK_MASTER_TOOLS).toBe("${env:TASK_MASTER_TOOLS}");
    });

    it("omits env block for servers with no env vars", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["beads"] }));
      const parsed = JSON.parse(result[1].content);
      const server = parsed.servers["beads"];
      expect(server).not.toHaveProperty("env");
    });

    it("includes multiple servers when multiple are selected", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster", "beads"] }));
      const parsed = JSON.parse(result[1].content);
      expect(Object.keys(parsed.servers)).toHaveLength(2);
      expect(parsed.servers).toHaveProperty("taskmaster-ai");
      expect(parsed.servers).toHaveProperty("beads");
    });
  });

  describe("all five registry servers", () => {
    it("generates entries for all 5 servers when all are selected", () => {
      const allMcps = ["taskmaster", "beads", "context7", "browsermcp", "sequential-thinking"];
      const result = generateMcpJson(makeConfig({ selectedMcps: allMcps }));

      const claudeCode = JSON.parse(result[0].content);
      const vscode = JSON.parse(result[1].content);

      expect(Object.keys(claudeCode.mcpServers)).toHaveLength(5);
      expect(Object.keys(vscode.servers)).toHaveLength(5);

      // Both should have the same server names
      expect(Object.keys(claudeCode.mcpServers).sort()).toEqual(Object.keys(vscode.servers).sort());
    });

    it("maps server names to claudeMcpName correctly", () => {
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
    it("skips servers not in the registry", () => {
      const result = generateMcpJson(makeConfig({ selectedMcps: ["taskmaster", "nonexistent"] }));
      const parsed = JSON.parse(result[0].content);
      expect(Object.keys(parsed.mcpServers)).toHaveLength(1);
      expect(parsed.mcpServers).toHaveProperty("taskmaster-ai");
    });
  });
});
