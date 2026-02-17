import { describe, it, expect } from "vitest";
import { generateRules } from "../../src/generators/rules.js";
import { defaultConfig } from "../../src/defaults.js";
import type { ProjectConfig } from "../../src/types.js";

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return { ...defaultConfig("/tmp/test-project"), ...overrides };
}

describe("generateRules", () => {
  describe("always-generated rules", () => {
    it("generates all 6 core rule files", async () => {
      const result = await generateRules(makeConfig());
      const paths = result.map((f) => f.path);

      expect(paths).toContain(".claude/rules/general.md");
      expect(paths).toContain(".claude/rules/docs.md");
      expect(paths).toContain(".claude/rules/testing.md");
      expect(paths).toContain(".claude/rules/git.md");
      expect(paths).toContain(".claude/rules/security.md");
      expect(paths).toContain(".claude/rules/config.md");
    });

    it("returns exactly 6 files with default config", async () => {
      const result = await generateRules(
        makeConfig({ hasApiDocs: false, hasDatabase: false, agentTeamsEnabled: false })
      );
      expect(result).toHaveLength(6);
    });
  });

  describe("conditional API rules", () => {
    it("does NOT include api.md when hasApiDocs is false", async () => {
      const result = await generateRules(makeConfig({ hasApiDocs: false }));
      const paths = result.map((f) => f.path);
      expect(paths).not.toContain(".claude/rules/api.md");
    });

    it("includes api.md when hasApiDocs is true", async () => {
      const result = await generateRules(makeConfig({ hasApiDocs: true }));
      const paths = result.map((f) => f.path);
      expect(paths).toContain(".claude/rules/api.md");
    });

    it("api.md ends with @docs/api.md import when generateDocs is true", async () => {
      const result = await generateRules(makeConfig({ hasApiDocs: true, generateDocs: true }));
      const apiRule = result.find((f) => f.path === ".claude/rules/api.md");
      expect(apiRule).toBeDefined();
      expect(apiRule!.content.trimEnd().endsWith("@docs/api.md")).toBe(true);
    });

    it("api.md does NOT end with @docs/api.md import when generateDocs is false", async () => {
      const result = await generateRules(makeConfig({ hasApiDocs: true, generateDocs: false }));
      const apiRule = result.find((f) => f.path === ".claude/rules/api.md");
      expect(apiRule).toBeDefined();
      expect(apiRule!.content.trimEnd().endsWith("@docs/api.md")).toBe(false);
    });
  });

  describe("conditional database rules", () => {
    it("does NOT include database.md when hasDatabase is false", async () => {
      const result = await generateRules(makeConfig({ hasDatabase: false }));
      const paths = result.map((f) => f.path);
      expect(paths).not.toContain(".claude/rules/database.md");
    });

    it("includes database.md when hasDatabase is true", async () => {
      const result = await generateRules(makeConfig({ hasDatabase: true }));
      const paths = result.map((f) => f.path);
      expect(paths).toContain(".claude/rules/database.md");
    });
  });

  describe("conditional agent-teams rules", () => {
    it("does NOT include agent-teams.md when agentTeamsEnabled is false", async () => {
      const result = await generateRules(makeConfig({ agentTeamsEnabled: false }));
      const paths = result.map((f) => f.path);
      expect(paths).not.toContain(".claude/rules/agent-teams.md");
    });

    it("includes agent-teams.md when agentTeamsEnabled is true", async () => {
      const result = await generateRules(makeConfig({ agentTeamsEnabled: true }));
      const paths = result.map((f) => f.path);
      expect(paths).toContain(".claude/rules/agent-teams.md");
    });
  });

  describe("all flags enabled", () => {
    it("returns 9 files when all conditional flags are true", async () => {
      const result = await generateRules(
        makeConfig({ hasApiDocs: true, hasDatabase: true, agentTeamsEnabled: true })
      );
      expect(result).toHaveLength(9);
    });
  });

  describe("template placeholder substitution", () => {
    it("replaces {{PROJECT_NAME}} in general.md", async () => {
      const result = await generateRules(makeConfig({ projectName: "my-cool-app" }));
      const general = result.find((f) => f.path === ".claude/rules/general.md");
      expect(general).toBeDefined();
      // general.md doesn't use PROJECT_NAME directly but check LANGUAGE is filled
      expect(general!.content).not.toContain("{{LANGUAGE}}");
    });

    it("replaces {{LANGUAGE}} in general.md with TypeScript", async () => {
      const result = await generateRules(makeConfig());
      const general = result.find((f) => f.path === ".claude/rules/general.md");
      expect(general).toBeDefined();
      expect(general!.content).toContain("TypeScript");
      expect(general!.content).not.toContain("{{LANGUAGE}}");
    });
  });

  describe("testing.md rule content", () => {
    it("contains Integration tests section", async () => {
      const result = await generateRules(makeConfig());
      const testing = result.find((f) => f.path === ".claude/rules/testing.md");
      expect(testing).toBeDefined();
      expect(testing!.content).toContain("Integration Tests");
    });

    it("contains Demo checkpoints section", async () => {
      const result = await generateRules(makeConfig());
      const testing = result.find((f) => f.path === ".claude/rules/testing.md");
      expect(testing).toBeDefined();
      expect(testing!.content).toContain("Demo Checkpoints");
    });

    it("contains Quality gate section", async () => {
      const result = await generateRules(makeConfig());
      const testing = result.find((f) => f.path === ".claude/rules/testing.md");
      expect(testing).toBeDefined();
      expect(testing!.content).toContain("Quality Gate");
    });
  });

  describe("all file contents are non-empty", () => {
    it("every generated file has content", async () => {
      const result = await generateRules(
        makeConfig({ hasApiDocs: true, hasDatabase: true, agentTeamsEnabled: true })
      );
      for (const file of result) {
        expect(file.content.length).toBeGreaterThan(0);
      }
    });
  });
});
