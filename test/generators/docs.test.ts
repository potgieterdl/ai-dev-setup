import { describe, it, expect } from "vitest";
import { generateDocs } from "../../src/generators/docs.js";
import { defaultConfig } from "../../src/defaults.js";
import type { ProjectConfig } from "../../src/types.js";

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return { ...defaultConfig("/tmp/test-project"), ...overrides };
}

describe("generateDocs", () => {
  describe("core docs output", () => {
    it("generates all 6 core doc files plus ADR template", async () => {
      const result = await generateDocs(makeConfig({ hasApiDocs: false }));
      const paths = result.map((f) => f.path);

      expect(paths).toContain("docs/doc_format.md");
      expect(paths).toContain("docs/prd.md");
      expect(paths).toContain("docs/architecture.md");
      expect(paths).toContain("docs/cuj.md");
      expect(paths).toContain("docs/testing_strategy.md");
      expect(paths).toContain("docs/onboarding.md");
      expect(paths).toContain("docs/adr/adr_template.md");
    });

    it("does NOT include docs/api.md when hasApiDocs is false", async () => {
      const result = await generateDocs(makeConfig({ hasApiDocs: false }));
      const paths = result.map((f) => f.path);
      expect(paths).not.toContain("docs/api.md");
    });

    it("returns exactly 7 files when hasApiDocs is false and tracker is not markdown", async () => {
      const result = await generateDocs(
        makeConfig({ hasApiDocs: false, taskTracker: "taskmaster" })
      );
      expect(result).toHaveLength(7);
    });
  });

  describe("API docs", () => {
    it("includes docs/api.md when hasApiDocs is true", async () => {
      const result = await generateDocs(makeConfig({ hasApiDocs: true }));
      const paths = result.map((f) => f.path);
      expect(paths).toContain("docs/api.md");
    });

    it("returns 8 files when hasApiDocs is true and tracker is not markdown", async () => {
      const result = await generateDocs(
        makeConfig({ hasApiDocs: true, taskTracker: "taskmaster" })
      );
      expect(result).toHaveLength(8);
    });
  });

  describe("simple markdown task tracker", () => {
    it("includes TASKS.md when taskTracker is markdown", async () => {
      const result = await generateDocs(makeConfig({ taskTracker: "markdown" }));
      const paths = result.map((f) => f.path);
      expect(paths).toContain("TASKS.md");
    });

    it("does NOT include TASKS.md when taskTracker is taskmaster", async () => {
      const result = await generateDocs(makeConfig({ taskTracker: "taskmaster" }));
      const paths = result.map((f) => f.path);
      expect(paths).not.toContain("TASKS.md");
    });

    it("does NOT include TASKS.md when taskTracker is beads", async () => {
      const result = await generateDocs(makeConfig({ taskTracker: "beads" }));
      const paths = result.map((f) => f.path);
      expect(paths).not.toContain("TASKS.md");
    });
  });

  describe("template placeholder substitution", () => {
    it("replaces {{PROJECT_NAME}} in all generated content", async () => {
      const result = await generateDocs(makeConfig({ projectName: "my-test-app" }));

      // Check a few key files for the replacement
      const prd = result.find((f) => f.path === "docs/prd.md");
      expect(prd).toBeDefined();
      expect(prd!.content).toContain("my-test-app");
      expect(prd!.content).not.toContain("{{PROJECT_NAME}}");

      const arch = result.find((f) => f.path === "docs/architecture.md");
      expect(arch).toBeDefined();
      expect(arch!.content).toContain("my-test-app");
      expect(arch!.content).not.toContain("{{PROJECT_NAME}}");
    });

    it("replaces {{ARCHITECTURE}} in architecture.md", async () => {
      const result = await generateDocs(makeConfig({ architecture: "3-tier" }));
      const arch = result.find((f) => f.path === "docs/architecture.md");
      expect(arch).toBeDefined();
      expect(arch!.content).toContain("3-tier");
      expect(arch!.content).not.toContain("{{ARCHITECTURE}}");
    });

    it("replaces {{DATE}} in prd.md with ISO date format", async () => {
      const result = await generateDocs(makeConfig());
      const prd = result.find((f) => f.path === "docs/prd.md");
      expect(prd).toBeDefined();
      // Should have a date like YYYY-MM-DD
      expect(prd!.content).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(prd!.content).not.toContain("{{DATE}}");
    });

    it("replaces {{PROJECT_NAME}} in TASKS.md when using markdown tracker", async () => {
      const result = await generateDocs(
        makeConfig({ taskTracker: "markdown", projectName: "cool-project" })
      );
      const tasks = result.find((f) => f.path === "TASKS.md");
      expect(tasks).toBeDefined();
      expect(tasks!.content).toContain("cool-project");
      expect(tasks!.content).not.toContain("{{PROJECT_NAME}}");
    });
  });

  describe("ADR template", () => {
    it("is always included in output", async () => {
      const result = await generateDocs(makeConfig());
      const adr = result.find((f) => f.path === "docs/adr/adr_template.md");
      expect(adr).toBeDefined();
    });

    it("uses NNN and Decision Title as placeholders", async () => {
      const result = await generateDocs(makeConfig());
      const adr = result.find((f) => f.path === "docs/adr/adr_template.md");
      expect(adr!.content).toContain("ADR-NNN: Decision Title");
    });

    it("replaces {{DATE}} in ADR template", async () => {
      const result = await generateDocs(makeConfig());
      const adr = result.find((f) => f.path === "docs/adr/adr_template.md");
      expect(adr!.content).not.toContain("{{DATE}}");
      expect(adr!.content).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe("doc_format.md", () => {
    it("contains no placeholders (static content)", async () => {
      const result = await generateDocs(makeConfig());
      const docFormat = result.find((f) => f.path === "docs/doc_format.md");
      expect(docFormat).toBeDefined();
      expect(docFormat!.content).not.toMatch(/\{\{\w+\}\}/);
    });

    it("contains TLDR section", async () => {
      const result = await generateDocs(makeConfig());
      const docFormat = result.find((f) => f.path === "docs/doc_format.md");
      expect(docFormat!.content).toContain("TLDR");
    });
  });

  describe("all file contents are non-empty", () => {
    it("every generated file has content", async () => {
      const result = await generateDocs(makeConfig({ hasApiDocs: true, taskTracker: "markdown" }));
      for (const file of result) {
        expect(file.content.length).toBeGreaterThan(0);
      }
    });
  });
});
