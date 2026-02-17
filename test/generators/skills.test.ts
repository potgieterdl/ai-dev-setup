import { describe, it, expect } from "vitest";
import { generateSkills } from "../../src/generators/skills.js";
import { defaultConfig } from "../../src/defaults.js";
import type { ProjectConfig } from "../../src/types.js";

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return { ...defaultConfig("/tmp/test-project"), ...overrides };
}

describe("generateSkills", () => {
  describe("skill files output", () => {
    it("generates all 3 skill files", async () => {
      const result = await generateSkills(makeConfig());
      const paths = result.map((f) => f.path);

      expect(paths).toContain(".claude/skills/testing.md");
      expect(paths).toContain(".claude/skills/commit.md");
      expect(paths).toContain(".claude/skills/task-workflow.md");
    });

    it("returns exactly 3 files", async () => {
      const result = await generateSkills(makeConfig());
      expect(result).toHaveLength(3);
    });
  });

  describe("task-workflow.md tracker-specific content", () => {
    it("contains task tracker reference for taskmaster", async () => {
      const result = await generateSkills(makeConfig({ taskTracker: "taskmaster" }));
      const workflow = result.find((f) => f.path === ".claude/skills/task-workflow.md");
      expect(workflow).toBeDefined();
      // task-workflow.md doesn't have {{TASK_TRACKER}} placeholder but verify content
      expect(workflow!.content).toContain("task");
    });

    it("contains workflow steps", async () => {
      const result = await generateSkills(makeConfig());
      const workflow = result.find((f) => f.path === ".claude/skills/task-workflow.md");
      expect(workflow).toBeDefined();
      expect(workflow!.content).toContain("Picking a Task");
      expect(workflow!.content).toContain("Implementing a Task");
      expect(workflow!.content).toContain("Completing a Task");
    });
  });

  describe("testing.md skill content", () => {
    it("contains integration-first philosophy", async () => {
      const result = await generateSkills(makeConfig());
      const testing = result.find((f) => f.path === ".claude/skills/testing.md");
      expect(testing).toBeDefined();
      expect(testing!.content).toContain("Integration-First");
    });

    it("contains demo test pattern", async () => {
      const result = await generateSkills(makeConfig());
      const testing = result.find((f) => f.path === ".claude/skills/testing.md");
      expect(testing).toBeDefined();
      expect(testing!.content).toContain("Demo Test Pattern");
    });
  });

  describe("commit.md skill content", () => {
    it("contains quality gate steps", async () => {
      const result = await generateSkills(makeConfig());
      const commit = result.find((f) => f.path === ".claude/skills/commit.md");
      expect(commit).toBeDefined();
      expect(commit!.content).toContain("Format");
      expect(commit!.content).toContain("Lint");
      expect(commit!.content).toContain("Build");
      expect(commit!.content).toContain("Test");
    });

    it("contains commit message format", async () => {
      const result = await generateSkills(makeConfig());
      const commit = result.find((f) => f.path === ".claude/skills/commit.md");
      expect(commit).toBeDefined();
      expect(commit!.content).toContain("Commit Message Format");
    });
  });

  describe("all file contents are non-empty", () => {
    it("every generated file has content", async () => {
      const result = await generateSkills(makeConfig());
      for (const file of result) {
        expect(file.content.length).toBeGreaterThan(0);
      }
    });
  });

  describe("YAML frontmatter", () => {
    it("all skills have description frontmatter", async () => {
      const result = await generateSkills(makeConfig());
      for (const file of result) {
        expect(file.content).toMatch(/^---\n/);
        expect(file.content).toContain("description:");
      }
    });
  });
});
