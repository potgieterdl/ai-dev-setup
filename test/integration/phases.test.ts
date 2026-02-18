import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runPostCreate } from "../../src/phases/post-create.js";
import { runPostStart } from "../../src/phases/post-start.js";
import { defaultConfig } from "../../src/defaults.js";
import type { ProjectConfig } from "../../src/types.js";

let tmpDir: string;

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return { ...defaultConfig(tmpDir), ...overrides };
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-init-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("runPostCreate", () => {
  it("creates expected files for a minimal config", async () => {
    const config = makeConfig({
      generateDocs: true,
      generateRules: true,
      generateSkills: true,
      generateHooks: true,
      generateCommands: true,
    });

    const written = await runPostCreate(config);

    // Should produce files
    expect(written.length).toBeGreaterThan(0);

    // Core always-generated files should be present
    expect(written).toContain(".mcp.json");
    expect(written).toContain(".vscode/mcp.json");
    expect(written).toContain("CLAUDE.md");
    expect(written).toContain(".devcontainer/devcontainer.json");
  });

  it("all returned file paths exist on disk", async () => {
    const config = makeConfig();
    const written = await runPostCreate(config);

    for (const relPath of written) {
      const fullPath = path.join(tmpDir, relPath);
      const stat = await fs.stat(fullPath);
      expect(stat.isFile()).toBe(true);
    }
  });

  it("respects overwrite=false and does not overwrite existing files", async () => {
    const config = makeConfig();

    // Create .mcp.json with sentinel content before running
    const mcpPath = path.join(tmpDir, ".mcp.json");
    await fs.mkdir(path.dirname(mcpPath), { recursive: true });
    await fs.writeFile(mcpPath, "SENTINEL_CONTENT", "utf8");

    await runPostCreate(config, false);

    // .mcp.json should still have sentinel content
    const content = await fs.readFile(mcpPath, "utf8");
    expect(content).toBe("SENTINEL_CONTENT");
  });

  it("tracks generated files in config.generatedFiles", async () => {
    const config = makeConfig();
    const written = await runPostCreate(config);

    expect(config.generatedFiles).toEqual(written);
  });

  it("generates conditional files when flags are enabled", async () => {
    const config = makeConfig({
      generateDocs: true,
      generateRules: true,
      generateSkills: true,
      generateHooks: true,
      generateCommands: true,
    });

    const written = await runPostCreate(config);

    // Docs
    expect(written).toContain("docs/prd.md");
    expect(written).toContain("docs/architecture.md");

    // Rules
    expect(written).toContain(".claude/rules/general.md");
    expect(written).toContain(".claude/rules/testing.md");

    // Skills
    expect(written).toContain(".claude/skills/testing.md");

    // Hooks
    expect(written).toContain(".claude/hooks/pre-commit.sh");

    // Commands
    expect(written).toContain(".claude/commands/dev-next.md");
    expect(written).toContain(".claude/commands/review.md");
  });

  it("skips conditional files when flags are disabled", async () => {
    const config = makeConfig({
      generateDocs: false,
      generateRules: false,
      generateSkills: false,
      generateHooks: false,
      generateCommands: false,
    });

    const written = await runPostCreate(config);

    // Should NOT contain conditional files
    expect(written).not.toContain("docs/prd.md");
    expect(written).not.toContain(".claude/rules/general.md");
    expect(written).not.toContain(".claude/skills/testing.md");
    expect(written).not.toContain(".claude/hooks/pre-commit.sh");
    expect(written).not.toContain(".claude/commands/dev-next.md");

    // Should still contain always-generated files
    expect(written).toContain(".mcp.json");
    expect(written).toContain("CLAUDE.md");
    expect(written).toContain(".devcontainer/devcontainer.json");
  });
});

describe("runPostStart", () => {
  it("does not throw with default config and no task files", async () => {
    const config = makeConfig();
    await expect(runPostStart(config)).resolves.not.toThrow();
  });

  it("reads Task Master tasks.json and prints summary", async () => {
    const config = makeConfig({ taskTracker: "taskmaster" });

    // Create a minimal tasks.json
    const tasksDir = path.join(tmpDir, ".taskmaster/tasks");
    await fs.mkdir(tasksDir, { recursive: true });
    await fs.writeFile(
      path.join(tasksDir, "tasks.json"),
      JSON.stringify({
        tasks: [
          { id: 1, title: "Task 1", status: "done" },
          { id: 2, title: "Task 2", status: "pending" },
          { id: 3, title: "Task 3", status: "in-progress" },
        ],
      }),
      "utf8"
    );

    // Should not throw — we just verify it runs successfully
    await expect(runPostStart(config)).resolves.not.toThrow();
  });

  it("reads TASKS.md for markdown tracker", async () => {
    const config = makeConfig({ taskTracker: "markdown" });

    // Create a simple TASKS.md
    await fs.writeFile(
      path.join(tmpDir, "TASKS.md"),
      `# Tasks\n\n| # | Task | Status |\n|---|---|---|\n| 1 | Setup | [x] |\n| 2 | Auth | [ ] |\n`,
      "utf8"
    );

    await expect(runPostStart(config)).resolves.not.toThrow();
  });

  it("syncs env vars to .env file", async () => {
    const config = makeConfig();

    // Set an env var that should be synced
    const originalKey = process.env["ANTHROPIC_API_KEY"];
    process.env["ANTHROPIC_API_KEY"] = "test-key-12345";

    try {
      await runPostStart(config);

      const envContent = await fs.readFile(path.join(tmpDir, ".env"), "utf8");
      expect(envContent).toContain("ANTHROPIC_API_KEY=test-key-12345");
    } finally {
      // Restore original env
      if (originalKey !== undefined) {
        process.env["ANTHROPIC_API_KEY"] = originalKey;
      } else {
        delete process.env["ANTHROPIC_API_KEY"];
      }
    }
  });

  it("does not overwrite existing .env entries", async () => {
    const config = makeConfig();

    // Pre-create .env with an existing key
    await fs.writeFile(path.join(tmpDir, ".env"), "ANTHROPIC_API_KEY=existing-key\n", "utf8");

    const originalKey = process.env["ANTHROPIC_API_KEY"];
    process.env["ANTHROPIC_API_KEY"] = "new-key-should-not-overwrite";

    try {
      await runPostStart(config);

      const envContent = await fs.readFile(path.join(tmpDir, ".env"), "utf8");
      expect(envContent).toContain("ANTHROPIC_API_KEY=existing-key");
      expect(envContent).not.toContain("new-key-should-not-overwrite");
    } finally {
      if (originalKey !== undefined) {
        process.env["ANTHROPIC_API_KEY"] = originalKey;
      } else {
        delete process.env["ANTHROPIC_API_KEY"];
      }
    }
  });

  it("reads tagged Task Master tasks.json format (master.tasks)", async () => {
    const config = makeConfig({ taskTracker: "taskmaster" });

    // Create a tagged tasks.json (format used when Task Master tags are enabled)
    const tasksDir = path.join(tmpDir, ".taskmaster/tasks");
    await fs.mkdir(tasksDir, { recursive: true });
    await fs.writeFile(
      path.join(tasksDir, "tasks.json"),
      JSON.stringify({
        master: {
          tasks: [
            { id: "1", title: "Task 1", status: "done" },
            { id: "2", title: "Task 2", status: "pending" },
          ],
        },
      }),
      "utf8"
    );

    await expect(runPostStart(config)).resolves.not.toThrow();
  });

  it("handles beads tracker gracefully with no task file", async () => {
    const config = makeConfig({ taskTracker: "beads" });
    await expect(runPostStart(config)).resolves.not.toThrow();
  });
});
