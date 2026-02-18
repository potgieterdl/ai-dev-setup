import { describe, it, expect } from "vitest";
import { generateRules } from "../../src/generators/rules.js";
import { defaultConfig } from "../../src/defaults.js";
import type { ProjectConfig } from "../../src/types.js";

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return { ...defaultConfig("/tmp/test-project"), ...overrides };
}

describe("generateRules", () => {
  describe("always-generated rules", () => {
    it("smoke: generates all 6 core rule files", async () => {
      const result = await generateRules(makeConfig());
      const paths = result.map((f) => f.path);

      expect(paths).toContain(".claude/rules/general.md");
      expect(paths).toContain(".claude/rules/docs.md");
      expect(paths).toContain(".claude/rules/testing.md");
      expect(paths).toContain(".claude/rules/git.md");
      expect(paths).toContain(".claude/rules/security.md");
      expect(paths).toContain(".claude/rules/config.md");
    });

    it("smoke: returns exactly 6 files with default config", async () => {
      const result = await generateRules(
        makeConfig({ hasApiDocs: false, hasDatabase: false, agentTeamsEnabled: false })
      );
      expect(result).toHaveLength(6);
    });
  });

  describe("conditional API rules", () => {
    it("demo: does NOT include api.md when hasApiDocs is false", async () => {
      const result = await generateRules(makeConfig({ hasApiDocs: false }));
      const paths = result.map((f) => f.path);
      expect(paths).not.toContain(".claude/rules/api.md");
    });

    it("demo: includes api.md when hasApiDocs is true", async () => {
      const result = await generateRules(makeConfig({ hasApiDocs: true }));
      const paths = result.map((f) => f.path);
      expect(paths).toContain(".claude/rules/api.md");
    });

    it("demo: api.md ends with @docs/api.md import when generateDocs is true", async () => {
      const result = await generateRules(makeConfig({ hasApiDocs: true, generateDocs: true }));
      const apiRule = result.find((f) => f.path === ".claude/rules/api.md");
      expect(apiRule).toBeDefined();
      expect(apiRule!.content.trimEnd().endsWith("@docs/api.md")).toBe(true);
    });

    it("demo: api.md does NOT end with @docs/api.md import when generateDocs is false", async () => {
      const result = await generateRules(makeConfig({ hasApiDocs: true, generateDocs: false }));
      const apiRule = result.find((f) => f.path === ".claude/rules/api.md");
      expect(apiRule).toBeDefined();
      expect(apiRule!.content.trimEnd().endsWith("@docs/api.md")).toBe(false);
    });
  });

  describe("conditional database rules", () => {
    it("demo: does NOT include database.md when hasDatabase is false", async () => {
      const result = await generateRules(makeConfig({ hasDatabase: false }));
      const paths = result.map((f) => f.path);
      expect(paths).not.toContain(".claude/rules/database.md");
    });

    it("demo: includes database.md when hasDatabase is true", async () => {
      const result = await generateRules(makeConfig({ hasDatabase: true }));
      const paths = result.map((f) => f.path);
      expect(paths).toContain(".claude/rules/database.md");
    });
  });

  describe("conditional agent-teams rules", () => {
    it("demo: does NOT include agent-teams.md when agentTeamsEnabled is false", async () => {
      const result = await generateRules(makeConfig({ agentTeamsEnabled: false }));
      const paths = result.map((f) => f.path);
      expect(paths).not.toContain(".claude/rules/agent-teams.md");
    });

    it("demo: includes agent-teams.md when agentTeamsEnabled is true", async () => {
      const result = await generateRules(makeConfig({ agentTeamsEnabled: true }));
      const paths = result.map((f) => f.path);
      expect(paths).toContain(".claude/rules/agent-teams.md");
    });
  });

  describe("all flags enabled", () => {
    it("demo: returns 9 files when all conditional flags are true", async () => {
      const result = await generateRules(
        makeConfig({ hasApiDocs: true, hasDatabase: true, agentTeamsEnabled: true })
      );
      expect(result).toHaveLength(9);
    });
  });

  describe("selectedRules filtering (F13)", () => {
    it("demo: only generates selected rules", async () => {
      const result = await generateRules(makeConfig({ selectedRules: ["general", "testing"] }));
      const paths = result.map((f) => f.path);
      expect(paths).toContain(".claude/rules/general.md");
      expect(paths).toContain(".claude/rules/testing.md");
      expect(paths).not.toContain(".claude/rules/docs.md");
      expect(paths).not.toContain(".claude/rules/git.md");
      expect(paths).not.toContain(".claude/rules/security.md");
      expect(paths).not.toContain(".claude/rules/config.md");
    });

    it("demo: respects hasApiDocs AND selectedRules for api rule", async () => {
      const result = await generateRules(
        makeConfig({ hasApiDocs: true, selectedRules: ["general"] })
      );
      const paths = result.map((f) => f.path);
      expect(paths).not.toContain(".claude/rules/api.md");
    });

    it("demo: generates api rule when both hasApiDocs and selectedRules include api", async () => {
      const result = await generateRules(
        makeConfig({ hasApiDocs: true, selectedRules: ["general", "api"] })
      );
      const paths = result.map((f) => f.path);
      expect(paths).toContain(".claude/rules/api.md");
    });

    it("demo: respects hasDatabase AND selectedRules for database rule", async () => {
      const result = await generateRules(
        makeConfig({ hasDatabase: true, selectedRules: ["general"] })
      );
      const paths = result.map((f) => f.path);
      expect(paths).not.toContain(".claude/rules/database.md");
    });

    it("demo: generates database rule when both hasDatabase and selectedRules include database", async () => {
      const result = await generateRules(
        makeConfig({ hasDatabase: true, selectedRules: ["general", "database"] })
      );
      const paths = result.map((f) => f.path);
      expect(paths).toContain(".claude/rules/database.md");
    });

    it("demo: returns exactly 1 file when only one rule is selected", async () => {
      const result = await generateRules(makeConfig({ selectedRules: ["git"] }));
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe(".claude/rules/git.md");
    });

    it("demo: agent-teams rule is not affected by selectedRules", async () => {
      const result = await generateRules(
        makeConfig({ agentTeamsEnabled: true, selectedRules: ["general"] })
      );
      const paths = result.map((f) => f.path);
      expect(paths).toContain(".claude/rules/agent-teams.md");
      expect(paths).toContain(".claude/rules/general.md");
      expect(result).toHaveLength(2);
    });
  });

  describe("template placeholder substitution", () => {
    it("demo: replaces {{LANGUAGE}} placeholder in general.md", async () => {
      const result = await generateRules(makeConfig({ projectName: "my-cool-app" }));
      const general = result.find((f) => f.path === ".claude/rules/general.md");
      expect(general).toBeDefined();
      expect(general!.content).not.toContain("{{LANGUAGE}}");
    });

    it("demo: general.md contains TypeScript as the language", async () => {
      const result = await generateRules(makeConfig());
      const general = result.find((f) => f.path === ".claude/rules/general.md");
      expect(general).toBeDefined();
      expect(general!.content).toContain("TypeScript");
      expect(general!.content).not.toContain("{{LANGUAGE}}");
    });
  });

  describe("testing.md rule content", () => {
    it("demo: testing.md rule contains Integration tests section", async () => {
      const result = await generateRules(makeConfig());
      const testing = result.find((f) => f.path === ".claude/rules/testing.md");
      expect(testing).toBeDefined();
      expect(testing!.content).toContain("Integration Tests");
    });

    it("demo: testing.md rule contains Demo checkpoints section", async () => {
      const result = await generateRules(makeConfig());
      const testing = result.find((f) => f.path === ".claude/rules/testing.md");
      expect(testing).toBeDefined();
      expect(testing!.content).toContain("Demo Checkpoints");
    });

    it("demo: testing.md rule contains Quality gate section", async () => {
      const result = await generateRules(makeConfig());
      const testing = result.find((f) => f.path === ".claude/rules/testing.md");
      expect(testing).toBeDefined();
      expect(testing!.content).toContain("Quality Gate");
    });
  });

  describe("all file contents are non-empty", () => {
    it("smoke: every generated file has content", async () => {
      const result = await generateRules(
        makeConfig({ hasApiDocs: true, hasDatabase: true, agentTeamsEnabled: true })
      );
      for (const file of result) {
        expect(file.content.length).toBeGreaterThan(0);
      }
    });
  });

  describe("AI analysis result integration (F20)", () => {
    it("demo: api.md uses detected paths when analysisResult is present", async () => {
      const result = await generateRules(
        makeConfig({
          hasApiDocs: true,
          analysisResult: {
            detectedArchitecture: "3-tier",
            apiPaths: ["src/server/routes/**", "src/controllers/**"],
            dbPaths: ["prisma/**"],
            testPaths: ["test/**"],
            architectureGuidance: "Express app.",
            recommendedRules: ["general", "api"],
            hookSteps: ["format", "lint", "test"],
          },
        })
      );
      const apiRule = result.find((f) => f.path === ".claude/rules/api.md");
      expect(apiRule).toBeDefined();
      expect(apiRule!.content).toContain("src/server/routes/**");
      expect(apiRule!.content).toContain("src/controllers/**");
    });

    it("demo: database.md uses detected paths when analysisResult is present", async () => {
      const result = await generateRules(
        makeConfig({
          hasDatabase: true,
          analysisResult: {
            detectedArchitecture: "3-tier",
            apiPaths: ["src/api/**"],
            dbPaths: ["src/data/**", "drizzle/**"],
            testPaths: ["test/**"],
            architectureGuidance: "Express app.",
            recommendedRules: ["general", "database"],
            hookSteps: ["format", "lint", "test"],
          },
        })
      );
      const dbRule = result.find((f) => f.path === ".claude/rules/database.md");
      expect(dbRule).toBeDefined();
      expect(dbRule!.content).toContain("src/data/**");
      expect(dbRule!.content).toContain("drizzle/**");
    });

    it("demo: api.md falls back to default paths when no analysisResult", async () => {
      const result = await generateRules(makeConfig({ hasApiDocs: true }));
      const apiRule = result.find((f) => f.path === ".claude/rules/api.md");
      expect(apiRule).toBeDefined();
      expect(apiRule!.content).toContain("src/api/**");
      expect(apiRule!.content).toContain("src/routes/**");
    });

    it("demo: database.md falls back to default paths when no analysisResult", async () => {
      const result = await generateRules(makeConfig({ hasDatabase: true }));
      const dbRule = result.find((f) => f.path === ".claude/rules/database.md");
      expect(dbRule).toBeDefined();
      expect(dbRule!.content).toContain("src/db/**");
      expect(dbRule!.content).toContain("src/models/**");
    });
  });
});
