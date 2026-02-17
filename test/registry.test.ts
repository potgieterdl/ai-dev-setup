import { MCP_REGISTRY, getMcpByName, getSelectedServers } from "../src/registry.js";

describe("MCP_REGISTRY", () => {
  it("contains exactly 5 server entries", () => {
    expect(MCP_REGISTRY).toHaveLength(5);
  });

  it("includes all expected server names", () => {
    const names = MCP_REGISTRY.map((s) => s.name);
    expect(names).toEqual(["taskmaster", "beads", "context7", "browsermcp", "sequential-thinking"]);
  });

  it("beads entry has correct npmPackage and claudeMcpName", () => {
    const beads = MCP_REGISTRY.find((s) => s.name === "beads");
    expect(beads).toBeDefined();
    expect(beads!.npmPackage).toBe("beads-mcp");
    expect(beads!.claudeMcpName).toBe("beads");
  });

  it("taskmaster entry has TASK_MASTER_TOOLS env var set to all", () => {
    const tm = MCP_REGISTRY.find((s) => s.name === "taskmaster");
    expect(tm).toBeDefined();
    expect(tm!.env).toBeDefined();
    expect(tm!.env!.TASK_MASTER_TOOLS).toBe("all");
  });

  it("taskmaster entry has API key env placeholders", () => {
    const tm = MCP_REGISTRY.find((s) => s.name === "taskmaster");
    expect(tm!.env!.ANTHROPIC_API_KEY).toBe("${ANTHROPIC_API_KEY}");
    expect(tm!.env!.PERPLEXITY_API_KEY).toBe("${PERPLEXITY_API_KEY}");
  });

  it("all entries have required set to false", () => {
    for (const server of MCP_REGISTRY) {
      expect(server.required).toBe(false);
    }
  });

  it("all entries have args with -y flag followed by npmPackage", () => {
    for (const server of MCP_REGISTRY) {
      expect(server.args).toBeDefined();
      expect(server.args![0]).toBe("-y");
      expect(server.args![1]).toBe(server.npmPackage);
    }
  });
});

describe("getMcpByName", () => {
  it("returns the context7 server when queried by name", () => {
    const server = getMcpByName("context7");
    expect(server).toBeDefined();
    expect(server!.npmPackage).toBe("@upstash/context7-mcp");
    expect(server!.claudeMcpName).toBe("context7");
  });

  it("returns the browsermcp server when queried by name", () => {
    const server = getMcpByName("browsermcp");
    expect(server).toBeDefined();
    expect(server!.npmPackage).toBe("@anthropic-ai/mcp-server-puppeteer");
  });

  it("returns undefined for a nonexistent server name", () => {
    expect(getMcpByName("nonexistent")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getMcpByName("")).toBeUndefined();
  });
});

describe("getSelectedServers", () => {
  it("returns exactly 2 servers for taskmaster and beads", () => {
    const selected = getSelectedServers(["taskmaster", "beads"]);
    expect(selected).toHaveLength(2);
    const names = selected.map((s) => s.name);
    expect(names).toContain("taskmaster");
    expect(names).toContain("beads");
  });

  it("returns all 5 servers when all names are provided", () => {
    const allNames = MCP_REGISTRY.map((s) => s.name);
    const selected = getSelectedServers(allNames);
    expect(selected).toHaveLength(5);
  });

  it("returns an empty array for an empty selection", () => {
    expect(getSelectedServers([])).toEqual([]);
  });

  it("ignores unknown names in the selection", () => {
    const selected = getSelectedServers(["taskmaster", "unknown"]);
    expect(selected).toHaveLength(1);
    expect(selected[0].name).toBe("taskmaster");
  });
});
