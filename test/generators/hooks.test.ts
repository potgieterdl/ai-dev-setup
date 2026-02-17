import { describe, it, expect } from "vitest";
import { generateHooks } from "../../src/generators/hooks.js";
import { defaultConfig } from "../../src/defaults.js";
import type { ProjectConfig } from "../../src/types.js";

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return { ...defaultConfig("/tmp/test-project"), ...overrides };
}

describe("generateHooks", () => {
  describe("output files", () => {
    it("generates pre-commit.sh and settings.json", async () => {
      const result = await generateHooks(makeConfig());
      const paths = result.map((f) => f.path);

      expect(paths).toContain(".claude/hooks/pre-commit.sh");
      expect(paths).toContain(".claude/settings.json");
    });

    it("returns exactly 2 files", async () => {
      const result = await generateHooks(makeConfig());
      expect(result).toHaveLength(2);
    });
  });

  describe("pre-commit.sh", () => {
    it("is marked executable", async () => {
      const result = await generateHooks(makeConfig());
      const preCommit = result.find((f) => f.path === ".claude/hooks/pre-commit.sh");
      expect(preCommit).toBeDefined();
      expect(preCommit!.executable).toBe(true);
    });

    it("contains --if-present flags for graceful degradation", async () => {
      const result = await generateHooks(makeConfig());
      const preCommit = result.find((f) => f.path === ".claude/hooks/pre-commit.sh");
      expect(preCommit).toBeDefined();
      expect(preCommit!.content).toContain("--if-present");
    });

    it("contains all 5 quality gate steps in order", async () => {
      const result = await generateHooks(makeConfig());
      const preCommit = result.find((f) => f.path === ".claude/hooks/pre-commit.sh");
      expect(preCommit).toBeDefined();
      const content = preCommit!.content;

      // Verify all 5 steps exist
      expect(content).toContain("# 1. Format");
      expect(content).toContain("# 2. Lint");
      expect(content).toContain("# 3. Type-check");
      expect(content).toContain("# 4. Build");
      expect(content).toContain("# 5. Test");

      // Verify order: Format before Lint before Type-check before Build before Test
      const formatIdx = content.indexOf("# 1. Format");
      const lintIdx = content.indexOf("# 2. Lint");
      const typeIdx = content.indexOf("# 3. Type-check");
      const buildIdx = content.indexOf("# 4. Build");
      const testIdx = content.indexOf("# 5. Test");

      expect(formatIdx).toBeLessThan(lintIdx);
      expect(lintIdx).toBeLessThan(typeIdx);
      expect(typeIdx).toBeLessThan(buildIdx);
      expect(buildIdx).toBeLessThan(testIdx);
    });

    it("starts with bash shebang", async () => {
      const result = await generateHooks(makeConfig());
      const preCommit = result.find((f) => f.path === ".claude/hooks/pre-commit.sh");
      expect(preCommit).toBeDefined();
      expect(preCommit!.content).toMatch(/^#!/);
      expect(preCommit!.content).toContain("bash");
    });

    it("uses set -euo pipefail for strict mode", async () => {
      const result = await generateHooks(makeConfig());
      const preCommit = result.find((f) => f.path === ".claude/hooks/pre-commit.sh");
      expect(preCommit).toBeDefined();
      expect(preCommit!.content).toContain("set -euo pipefail");
    });
  });

  describe("settings.json", () => {
    it("contains PreToolUse hook matcher", async () => {
      const result = await generateHooks(makeConfig());
      const settings = result.find((f) => f.path === ".claude/settings.json");
      expect(settings).toBeDefined();

      const parsed = JSON.parse(settings!.content);
      expect(parsed.hooks).toBeDefined();
      expect(parsed.hooks.PreToolUse).toBeDefined();
      expect(parsed.hooks.PreToolUse).toHaveLength(1);
    });

    it("hook matcher targets git commit", async () => {
      const result = await generateHooks(makeConfig());
      const settings = result.find((f) => f.path === ".claude/settings.json");
      expect(settings).toBeDefined();

      const parsed = JSON.parse(settings!.content);
      const hook = parsed.hooks.PreToolUse[0];
      expect(hook.matcher).toBe("Bash(git commit)");
      expect(hook.hook).toBe(".claude/hooks/pre-commit.sh");
    });

    it("is valid JSON", async () => {
      const result = await generateHooks(makeConfig());
      const settings = result.find((f) => f.path === ".claude/settings.json");
      expect(settings).toBeDefined();
      expect(() => JSON.parse(settings!.content)).not.toThrow();
    });
  });

  describe("all file contents are non-empty", () => {
    it("every generated file has content", async () => {
      const result = await generateHooks(makeConfig());
      for (const file of result) {
        expect(file.content.length).toBeGreaterThan(0);
      }
    });
  });
});
