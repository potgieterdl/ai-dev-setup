import { describe, it, expect } from "vitest";
import { generateCommands } from "../../src/generators/commands.js";
import { defaultConfig } from "../../src/defaults.js";
import type { ProjectConfig } from "../../src/types.js";

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return { ...defaultConfig("/tmp/test-project"), ...overrides };
}

describe("generateCommands", () => {
  describe("file output", () => {
    it("smoke: generates all 3 files", async () => {
      const result = await generateCommands(makeConfig());
      const paths = result.map((f) => f.path);

      expect(paths).toContain(".claude/commands/dev-next.md");
      expect(paths).toContain(".claude/commands/review.md");
      expect(paths).toContain(".claude/boot-prompt.txt");
    });

    it("smoke: returns exactly 3 files", async () => {
      const result = await generateCommands(makeConfig());
      expect(result).toHaveLength(3);
    });

    it("smoke: every generated file has content", async () => {
      const result = await generateCommands(makeConfig());
      for (const file of result) {
        expect(file.content.length).toBeGreaterThan(0);
      }
    });
  });

  describe("dev-next.md tracker-specific content", () => {
    it("demo: dev-next.md contains task-master commands for taskmaster tracker", async () => {
      const result = await generateCommands(makeConfig({ taskTracker: "taskmaster" }));
      const devNext = result.find((f) => f.path === ".claude/commands/dev-next.md");
      expect(devNext).toBeDefined();
      expect(devNext!.content).toContain("task-master next");
      expect(devNext!.content).toContain("task-master set-status --id=<id> --status=done");
    });

    it("demo: dev-next.md contains bd commands for beads tracker", async () => {
      const result = await generateCommands(makeConfig({ taskTracker: "beads" }));
      const devNext = result.find((f) => f.path === ".claude/commands/dev-next.md");
      expect(devNext).toBeDefined();
      expect(devNext!.content).toContain("bd show");
      expect(devNext!.content).toContain("bd update <id> --status done");
    });

    it("demo: dev-next.md contains TASKS.md reference for markdown tracker", async () => {
      const result = await generateCommands(makeConfig({ taskTracker: "markdown" }));
      const devNext = result.find((f) => f.path === ".claude/commands/dev-next.md");
      expect(devNext).toBeDefined();
      expect(devNext!.content).toContain("TASKS.md");
    });
  });

  describe("review.md content", () => {
    it("demo: review.md contains git diff reference", async () => {
      const result = await generateCommands(makeConfig());
      const review = result.find((f) => f.path === ".claude/commands/review.md");
      expect(review).toBeDefined();
      expect(review!.content).toContain("git diff");
    });

    it("demo: review.md contains all quality gate steps", async () => {
      const result = await generateCommands(makeConfig());
      const review = result.find((f) => f.path === ".claude/commands/review.md");
      expect(review).toBeDefined();
      expect(review!.content).toContain("format");
      expect(review!.content).toContain("lint");
      expect(review!.content).toContain("type-check");
      expect(review!.content).toContain("build");
      expect(review!.content).toContain("test");
    });
  });

  describe("boot-prompt.txt content", () => {
    it("demo: boot-prompt.txt has project name substituted", async () => {
      const result = await generateCommands(makeConfig({ projectName: "my-cool-project" }));
      const boot = result.find((f) => f.path === ".claude/boot-prompt.txt");
      expect(boot).toBeDefined();
      expect(boot!.content).toContain("my-cool-project");
    });

    it("demo: boot-prompt.txt has tracker-specific content for taskmaster", async () => {
      const result = await generateCommands(makeConfig({ taskTracker: "taskmaster" }));
      const boot = result.find((f) => f.path === ".claude/boot-prompt.txt");
      expect(boot).toBeDefined();
      expect(boot!.content).toContain("taskmaster");
    });

    it("demo: boot-prompt.txt has tracker-specific content for beads", async () => {
      const result = await generateCommands(makeConfig({ taskTracker: "beads" }));
      const boot = result.find((f) => f.path === ".claude/boot-prompt.txt");
      expect(boot).toBeDefined();
      expect(boot!.content).toContain("beads");
    });

    it("demo: boot-prompt.txt references /dev-next and /review commands", async () => {
      const result = await generateCommands(makeConfig());
      const boot = result.find((f) => f.path === ".claude/boot-prompt.txt");
      expect(boot).toBeDefined();
      expect(boot!.content).toContain("/dev-next");
      expect(boot!.content).toContain("/review");
    });

    it("demo: boot-prompt.txt has no unresolved placeholders", async () => {
      const result = await generateCommands(makeConfig());
      const boot = result.find((f) => f.path === ".claude/boot-prompt.txt");
      expect(boot).toBeDefined();
      expect(boot!.content).not.toMatch(/\{\{\w+\}\}/);
    });
  });

  describe("no unresolved placeholders", () => {
    it("demo: dev-next.md has no unresolved placeholders", async () => {
      const result = await generateCommands(makeConfig());
      const devNext = result.find((f) => f.path === ".claude/commands/dev-next.md");
      expect(devNext).toBeDefined();
      expect(devNext!.content).not.toMatch(/\{\{\w+\}\}/);
    });
  });
});
