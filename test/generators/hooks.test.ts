import { describe, it, expect } from "vitest";
import { generateHooks } from "../../src/generators/hooks.js";
import { defaultConfig } from "../../src/defaults.js";
import type { ProjectConfig } from "../../src/types.js";

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return { ...defaultConfig("/tmp/test-project"), ...overrides };
}

describe("generateHooks", () => {
  describe("output files", () => {
    it("smoke: generates pre-commit.sh and settings.json", async () => {
      const result = await generateHooks(makeConfig());
      const paths = result.map((f) => f.path);

      expect(paths).toContain(".claude/hooks/pre-commit.sh");
      expect(paths).toContain(".claude/settings.json");
    });

    it("smoke: returns exactly 2 files", async () => {
      const result = await generateHooks(makeConfig());
      expect(result).toHaveLength(2);
    });
  });

  describe("pre-commit.sh", () => {
    it("demo: pre-commit.sh is marked executable", async () => {
      const result = await generateHooks(makeConfig());
      const preCommit = result.find((f) => f.path === ".claude/hooks/pre-commit.sh");
      expect(preCommit).toBeDefined();
      expect(preCommit!.executable).toBe(true);
    });

    it("demo: pre-commit.sh contains --if-present flags for graceful degradation", async () => {
      const result = await generateHooks(makeConfig());
      const preCommit = result.find((f) => f.path === ".claude/hooks/pre-commit.sh");
      expect(preCommit).toBeDefined();
      expect(preCommit!.content).toContain("--if-present");
    });

    it("demo: pre-commit.sh contains all 5 quality gate steps with default config", async () => {
      const result = await generateHooks(makeConfig());
      const preCommit = result.find((f) => f.path === ".claude/hooks/pre-commit.sh");
      expect(preCommit).toBeDefined();
      const content = preCommit!.content;

      expect(content).toContain("Format");
      expect(content).toContain("Lint");
      expect(content).toContain("Type-check");
      expect(content).toContain("Build");
      expect(content).toContain("Test");

      // Verify correct order
      const formatIdx = content.indexOf("Format");
      const lintIdx = content.indexOf("Lint");
      const typeIdx = content.indexOf("Type-check");
      const buildIdx = content.indexOf("Build");
      const testIdx = content.indexOf("Test");

      expect(formatIdx).toBeLessThan(lintIdx);
      expect(lintIdx).toBeLessThan(typeIdx);
      expect(typeIdx).toBeLessThan(buildIdx);
      expect(buildIdx).toBeLessThan(testIdx);
    });

    it("smoke: pre-commit.sh starts with bash shebang", async () => {
      const result = await generateHooks(makeConfig());
      const preCommit = result.find((f) => f.path === ".claude/hooks/pre-commit.sh");
      expect(preCommit).toBeDefined();
      expect(preCommit!.content).toMatch(/^#!/);
      expect(preCommit!.content).toContain("bash");
    });

    it("demo: pre-commit.sh uses set -euo pipefail for strict mode", async () => {
      const result = await generateHooks(makeConfig());
      const preCommit = result.find((f) => f.path === ".claude/hooks/pre-commit.sh");
      expect(preCommit).toBeDefined();
      expect(preCommit!.content).toContain("set -euo pipefail");
    });
  });

  describe("selectedHookSteps filtering (F13)", () => {
    it("demo: generates pre-commit.sh with only selected steps", async () => {
      const result = await generateHooks(makeConfig({ selectedHookSteps: ["format", "lint"] }));
      const script = result.find((f) => f.path.includes("pre-commit.sh"))?.content ?? "";
      expect(script).toContain("npm run format");
      expect(script).toContain("npm run lint");
      expect(script).not.toContain("npm run typecheck");
      expect(script).not.toContain("npm run build");
      expect(script).not.toContain("npm test");
    });

    it("demo: generates a valid bash script with a single step", async () => {
      const result = await generateHooks(makeConfig({ selectedHookSteps: ["test"] }));
      const script = result.find((f) => f.path.includes("pre-commit.sh"))?.content ?? "";
      expect(script).toMatch(/^#!/);
      expect(script).toContain("npm test");
      expect(script).not.toContain("npm run format");
    });

    it("demo: step numbering reflects only selected steps", async () => {
      const result = await generateHooks(makeConfig({ selectedHookSteps: ["lint", "test"] }));
      const script = result.find((f) => f.path.includes("pre-commit.sh"))?.content ?? "";
      expect(script).toContain("# 1. Lint");
      expect(script).toContain("# 2. Test");
      expect(script).not.toContain("# 3.");
    });

    it("demo: all 5 steps included when all are selected", async () => {
      const result = await generateHooks(
        makeConfig({ selectedHookSteps: ["format", "lint", "typecheck", "build", "test"] })
      );
      const script = result.find((f) => f.path.includes("pre-commit.sh"))?.content ?? "";
      expect(script).toContain("# 1. Format");
      expect(script).toContain("# 2. Lint");
      expect(script).toContain("# 3. Type-check");
      expect(script).toContain("# 4. Build");
      expect(script).toContain("# 5. Test");
    });
  });

  describe("settings.json", () => {
    it("demo: settings.json contains PreToolUse hook matcher", async () => {
      const result = await generateHooks(makeConfig());
      const settings = result.find((f) => f.path === ".claude/settings.json");
      expect(settings).toBeDefined();

      const parsed = JSON.parse(settings!.content);
      expect(parsed.hooks).toBeDefined();
      expect(parsed.hooks.PreToolUse).toBeDefined();
      expect(parsed.hooks.PreToolUse).toHaveLength(1);
    });

    it("demo: hook matcher targets git commit with correct path", async () => {
      const result = await generateHooks(makeConfig());
      const settings = result.find((f) => f.path === ".claude/settings.json");
      expect(settings).toBeDefined();

      const parsed = JSON.parse(settings!.content);
      const hook = parsed.hooks.PreToolUse[0];
      expect(hook.matcher).toBe("Bash(git commit)");
      expect(hook.hook).toBe(".claude/hooks/pre-commit.sh");
    });

    it("smoke: settings.json is valid JSON", async () => {
      const result = await generateHooks(makeConfig());
      const settings = result.find((f) => f.path === ".claude/settings.json");
      expect(settings).toBeDefined();
      expect(() => JSON.parse(settings!.content)).not.toThrow();
    });
  });

  describe("all file contents are non-empty", () => {
    it("smoke: every generated file has content", async () => {
      const result = await generateHooks(makeConfig());
      for (const file of result) {
        expect(file.content.length).toBeGreaterThan(0);
      }
    });
  });
});
