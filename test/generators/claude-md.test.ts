import { describe, it, expect } from "vitest";
import { generateClaudeMd } from "../../src/generators/claude-md.js";
import { defaultConfig } from "../../src/defaults.js";
import type { ProjectConfig } from "../../src/types.js";

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return { ...defaultConfig("/tmp/test-project"), ...overrides };
}

describe("generateClaudeMd", () => {
  describe("file output structure", () => {
    it("returns CLAUDE.md and CLAUDE_MCP.md when MCPs are selected", () => {
      const result = generateClaudeMd(makeConfig({ selectedMcps: ["taskmaster"] }));
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe("CLAUDE.md");
      expect(result[1].path).toBe("CLAUDE_MCP.md");
    });

    it("returns only CLAUDE.md when no MCPs are selected", () => {
      const result = generateClaudeMd(makeConfig({ selectedMcps: [] }));
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("CLAUDE.md");
    });
  });

  describe("task tracker: taskmaster", () => {
    it("includes @./.taskmaster/CLAUDE.md import", () => {
      const result = generateClaudeMd(makeConfig({ taskTracker: "taskmaster" }));
      expect(result[0].content).toContain("@./.taskmaster/CLAUDE.md");
    });

    it("includes task-master next command", () => {
      const result = generateClaudeMd(makeConfig({ taskTracker: "taskmaster" }));
      expect(result[0].content).toContain("task-master next");
    });

    it("includes task-master set-status command", () => {
      const result = generateClaudeMd(makeConfig({ taskTracker: "taskmaster" }));
      expect(result[0].content).toContain("task-master set-status");
    });

    it("includes task-master expand command", () => {
      const result = generateClaudeMd(makeConfig({ taskTracker: "taskmaster" }));
      expect(result[0].content).toContain("task-master expand");
    });
  });

  describe("task tracker: beads", () => {
    it("includes beads_ready tool reference", () => {
      const result = generateClaudeMd(makeConfig({ taskTracker: "beads" }));
      expect(result[0].content).toContain("beads_ready");
    });

    it("includes bd sync command", () => {
      const result = generateClaudeMd(makeConfig({ taskTracker: "beads" }));
      expect(result[0].content).toContain("bd sync");
    });

    it("includes bd show command", () => {
      const result = generateClaudeMd(makeConfig({ taskTracker: "beads" }));
      expect(result[0].content).toContain("bd show");
    });
  });

  describe("task tracker: markdown", () => {
    it("references TASKS.md", () => {
      const result = generateClaudeMd(makeConfig({ taskTracker: "markdown" }));
      expect(result[0].content).toContain("TASKS.md");
    });

    it("includes checkbox syntax guidance", () => {
      const result = generateClaudeMd(makeConfig({ taskTracker: "markdown" }));
      expect(result[0].content).toContain("[x]");
    });
  });

  describe("doc imports", () => {
    it("includes @docs/ imports when generateDocs is true", () => {
      const result = generateClaudeMd(makeConfig({ generateDocs: true }));
      expect(result[0].content).toContain("@docs/prd.md");
      expect(result[0].content).toContain("@docs/architecture.md");
      expect(result[0].content).toContain("@docs/testing_strategy.md");
      expect(result[0].content).toContain("@docs/onboarding.md");
      expect(result[0].content).toContain("@docs/doc_format.md");
    });

    it("does NOT include @docs/ imports when generateDocs is false", () => {
      const result = generateClaudeMd(makeConfig({ generateDocs: false }));
      expect(result[0].content).not.toContain("@docs/prd.md");
      expect(result[0].content).not.toContain("@docs/architecture.md");
    });

    it("includes @docs/api.md when hasApiDocs is true", () => {
      const result = generateClaudeMd(makeConfig({ generateDocs: true, hasApiDocs: true }));
      expect(result[0].content).toContain("@docs/api.md");
    });

    it("does NOT include @docs/api.md when hasApiDocs is false", () => {
      const result = generateClaudeMd(makeConfig({ generateDocs: true, hasApiDocs: false }));
      expect(result[0].content).not.toContain("@docs/api.md");
    });
  });

  describe("rules section", () => {
    it("references .claude/rules/ when generateRules is true", () => {
      const result = generateClaudeMd(makeConfig({ generateRules: true }));
      expect(result[0].content).toContain(".claude/rules/");
    });

    it("does NOT reference .claude/rules/ when generateRules is false", () => {
      const result = generateClaudeMd(makeConfig({ generateRules: false }));
      expect(result[0].content).not.toContain(".claude/rules/");
    });
  });

  describe("quality gate", () => {
    it("includes the quality gate section", () => {
      const result = generateClaudeMd(makeConfig());
      expect(result[0].content).toContain("Quality Gate");
      expect(result[0].content).toContain("npm run format");
      expect(result[0].content).toContain("npm run lint");
      expect(result[0].content).toContain("npm run typecheck");
      expect(result[0].content).toContain("npm run build");
      expect(result[0].content).toContain("npm test");
    });
  });

  describe("MCP section in CLAUDE.md", () => {
    it("includes MCP section with @CLAUDE_MCP.md reference when MCPs are selected", () => {
      const result = generateClaudeMd(makeConfig({ selectedMcps: ["taskmaster", "context7"] }));
      expect(result[0].content).toContain("@CLAUDE_MCP.md");
      expect(result[0].content).toContain("taskmaster-ai");
      expect(result[0].content).toContain("context7");
    });

    it("does NOT include MCP section when no MCPs are selected", () => {
      const result = generateClaudeMd(makeConfig({ selectedMcps: [] }));
      expect(result[0].content).not.toContain("@CLAUDE_MCP.md");
    });
  });

  describe("CLAUDE_MCP.md content", () => {
    it("lists all selected servers with their descriptions and packages", () => {
      const result = generateClaudeMd(makeConfig({ selectedMcps: ["taskmaster", "context7"] }));
      const mcpFile = result.find((f) => f.path === "CLAUDE_MCP.md");
      expect(mcpFile).toBeDefined();
      expect(mcpFile!.content).toContain("taskmaster-ai");
      expect(mcpFile!.content).toContain("task-master-ai");
      expect(mcpFile!.content).toContain("context7");
      expect(mcpFile!.content).toContain("@upstash/context7-mcp");
    });

    it("includes MCP Servers Available heading", () => {
      const result = generateClaudeMd(makeConfig({ selectedMcps: ["taskmaster"] }));
      const mcpFile = result.find((f) => f.path === "CLAUDE_MCP.md");
      expect(mcpFile!.content).toContain("# MCP Servers Available");
    });

    it("includes separator between multiple servers", () => {
      const result = generateClaudeMd(makeConfig({ selectedMcps: ["taskmaster", "beads"] }));
      const mcpFile = result.find((f) => f.path === "CLAUDE_MCP.md");
      expect(mcpFile!.content).toContain("---");
    });
  });

  describe("header", () => {
    it("starts with # Project Instructions for Claude Code", () => {
      const result = generateClaudeMd(makeConfig());
      expect(result[0].content).toMatch(/^# Project Instructions for Claude Code/);
    });
  });
});
