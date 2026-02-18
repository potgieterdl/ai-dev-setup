import { describe, it, expect } from "vitest";
import { generateSkills } from "../../src/generators/skills.js";
import { defaultConfig } from "../../src/defaults.js";
import type { ProjectConfig } from "../../src/types.js";

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return { ...defaultConfig("/tmp/test-project"), ...overrides };
}

describe("generateSkills", () => {
  describe("skill files output", () => {
    it("smoke: generates all 3 skill files", async () => {
      const result = await generateSkills(makeConfig());
      const paths = result.map((f) => f.path);

      expect(paths).toContain(".claude/skills/testing.md");
      expect(paths).toContain(".claude/skills/commit.md");
      expect(paths).toContain(".claude/skills/task-workflow.md");
    });

    it("smoke: returns exactly 3 files", async () => {
      const result = await generateSkills(makeConfig());
      expect(result).toHaveLength(3);
    });
  });

  describe("task-workflow.md tracker-specific content", () => {
    it("demo: task-workflow.md contains task tracker reference", async () => {
      const result = await generateSkills(makeConfig({ taskTracker: "taskmaster" }));
      const workflow = result.find((f) => f.path === ".claude/skills/task-workflow.md");
      expect(workflow).toBeDefined();
      expect(workflow!.content).toContain("task");
    });

    it("demo: task-workflow.md contains picking, implementing, and completing steps", async () => {
      const result = await generateSkills(makeConfig());
      const workflow = result.find((f) => f.path === ".claude/skills/task-workflow.md");
      expect(workflow).toBeDefined();
      expect(workflow!.content).toContain("Picking a Task");
      expect(workflow!.content).toContain("Implementing a Task");
      expect(workflow!.content).toContain("Completing a Task");
    });
  });

  describe("testing.md skill content", () => {
    it("demo: testing.md skill covers integration-first philosophy", async () => {
      const result = await generateSkills(makeConfig());
      const testing = result.find((f) => f.path === ".claude/skills/testing.md");
      expect(testing).toBeDefined();
      expect(testing!.content).toContain("Integration-First");
    });

    it("demo: testing.md skill contains demo test pattern", async () => {
      const result = await generateSkills(makeConfig());
      const testing = result.find((f) => f.path === ".claude/skills/testing.md");
      expect(testing).toBeDefined();
      expect(testing!.content).toContain("Demo Test Pattern");
    });
  });

  describe("commit.md skill content", () => {
    it("demo: commit.md skill contains all quality gate steps", async () => {
      const result = await generateSkills(makeConfig());
      const commit = result.find((f) => f.path === ".claude/skills/commit.md");
      expect(commit).toBeDefined();
      expect(commit!.content).toContain("Format");
      expect(commit!.content).toContain("Lint");
      expect(commit!.content).toContain("Build");
      expect(commit!.content).toContain("Test");
    });

    it("demo: commit.md skill contains commit message format", async () => {
      const result = await generateSkills(makeConfig());
      const commit = result.find((f) => f.path === ".claude/skills/commit.md");
      expect(commit).toBeDefined();
      expect(commit!.content).toContain("Commit Message Format");
    });
  });

  describe("all file contents are non-empty", () => {
    it("smoke: every generated file has content", async () => {
      const result = await generateSkills(makeConfig());
      for (const file of result) {
        expect(file.content.length).toBeGreaterThan(0);
      }
    });
  });

  describe("YAML frontmatter", () => {
    it("smoke: all skills have description frontmatter", async () => {
      const result = await generateSkills(makeConfig());
      for (const file of result) {
        expect(file.content).toMatch(/^---\n/);
        expect(file.content).toContain("description:");
      }
    });
  });

  describe("selectedSkills filtering (F13)", () => {
    it("demo: only generates selected skills", async () => {
      const result = await generateSkills(makeConfig({ selectedSkills: ["commit"] }));
      const paths = result.map((f) => f.path);
      expect(paths).toContain(".claude/skills/commit.md");
      expect(paths).not.toContain(".claude/skills/testing.md");
      expect(paths).not.toContain(".claude/skills/task-workflow.md");
    });

    it("demo: returns exactly 1 file when only one skill is selected", async () => {
      const result = await generateSkills(makeConfig({ selectedSkills: ["testing"] }));
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe(".claude/skills/testing.md");
    });

    it("demo: returns 2 files when two skills are selected", async () => {
      const result = await generateSkills(
        makeConfig({ selectedSkills: ["commit", "task-workflow"] })
      );
      expect(result).toHaveLength(2);
      const paths = result.map((f) => f.path);
      expect(paths).toContain(".claude/skills/commit.md");
      expect(paths).toContain(".claude/skills/task-workflow.md");
    });

    it("demo: returns all 3 files when all skills are selected", async () => {
      const result = await generateSkills(
        makeConfig({ selectedSkills: ["testing", "commit", "task-workflow"] })
      );
      expect(result).toHaveLength(3);
    });
  });
});
