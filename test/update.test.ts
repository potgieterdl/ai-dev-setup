import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { readSavedConfig, writeSavedConfig, backupFiles } from "../src/utils.js";
import { computeChangedCategories } from "../src/update.js";
import type { SavedConfig } from "../src/types.js";

/** Create a minimal valid SavedConfig for testing. */
function makeSavedConfig(overrides: Partial<SavedConfig> = {}): SavedConfig {
  return {
    version: "0.1.0",
    selectedMcps: ["taskmaster"],
    taskTracker: "taskmaster",
    architecture: "skip",
    selectedRules: ["general", "testing", "git"],
    selectedHookSteps: ["format", "lint", "test"],
    selectedSkills: ["testing", "commit"],
    pm: "npm",
    agentTeamsEnabled: false,
    generatedAt: "2026-02-18T12:00:00Z",
    ...overrides,
  };
}

describe("readSavedConfig", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-init-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns null when .ai-init.json is absent", async () => {
    const result = await readSavedConfig(tmpDir);
    expect(result).toBeNull();
  });

  it("returns null for invalid JSON", async () => {
    await fs.writeFile(path.join(tmpDir, ".ai-init.json"), "not json {{{", "utf8");
    const result = await readSavedConfig(tmpDir);
    expect(result).toBeNull();
  });

  it("deserializes correctly from a valid JSON file", async () => {
    const config = makeSavedConfig();
    await fs.writeFile(path.join(tmpDir, ".ai-init.json"), JSON.stringify(config), "utf8");
    const result = await readSavedConfig(tmpDir);
    expect(result).toEqual(config);
  });
});

describe("writeSavedConfig", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-init-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("creates .ai-init.json with correct JSON content", async () => {
    const config = makeSavedConfig();
    await writeSavedConfig(tmpDir, config);
    const raw = await fs.readFile(path.join(tmpDir, ".ai-init.json"), "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    expect(JSON.parse(raw)).toEqual(config);
  });

  it("round-trips: write then read returns identical object", async () => {
    const config = makeSavedConfig({ selectedMcps: ["taskmaster", "context7"] });
    await writeSavedConfig(tmpDir, config);
    const result = await readSavedConfig(tmpDir);
    expect(result).toEqual(config);
  });
});

describe("backupFiles", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-init-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("copies specified files to .ai-init-backup/<timestamp>/", async () => {
    // Create a file to backup
    await fs.writeFile(path.join(tmpDir, "test.json"), '{"hello":"world"}', "utf8");

    const backupDir = await backupFiles(tmpDir, ["test.json"]);

    expect(backupDir).toContain(".ai-init-backup");
    const backedUp = await fs.readFile(path.join(backupDir, "test.json"), "utf8");
    expect(backedUp).toBe('{"hello":"world"}');
  });

  it("creates nested directory structure in backup", async () => {
    await fs.mkdir(path.join(tmpDir, ".claude", "rules"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, ".claude", "rules", "git.md"), "# Git", "utf8");

    const backupDir = await backupFiles(tmpDir, [".claude/rules/git.md"]);

    const backedUp = await fs.readFile(path.join(backupDir, ".claude", "rules", "git.md"), "utf8");
    expect(backedUp).toBe("# Git");
  });

  it("silently skips files that do not exist", async () => {
    // Should not throw
    const backupDir = await backupFiles(tmpDir, ["nonexistent.json", "also-missing.md"]);
    expect(backupDir).toContain(".ai-init-backup");

    // Backup dir is created but empty (no files to copy)
    const entries = await fs.readdir(backupDir);
    expect(entries).toEqual([]);
  });

  it("handles a mix of existing and non-existing files", async () => {
    await fs.writeFile(path.join(tmpDir, "exists.json"), "data", "utf8");

    const backupDir = await backupFiles(tmpDir, ["exists.json", "missing.json"]);

    const backedUp = await fs.readFile(path.join(backupDir, "exists.json"), "utf8");
    expect(backedUp).toBe("data");

    // missing.json should not be in backup
    await expect(fs.access(path.join(backupDir, "missing.json"))).rejects.toThrow();
  });
});

describe("computeChangedCategories", () => {
  it("returns empty set when configs are identical", () => {
    const a = makeSavedConfig();
    const b = makeSavedConfig();
    expect(computeChangedCategories(a, b).size).toBe(0);
  });

  it("detects MCP changes", () => {
    const a = makeSavedConfig({ selectedMcps: ["taskmaster"] });
    const b = makeSavedConfig({ selectedMcps: ["taskmaster", "context7"] });
    const changed = computeChangedCategories(a, b);
    expect(changed.has("mcp")).toBe(true);
    expect(changed.size).toBe(1);
  });

  it("detects tracker changes", () => {
    const a = makeSavedConfig({ taskTracker: "taskmaster" });
    const b = makeSavedConfig({ taskTracker: "beads" });
    const changed = computeChangedCategories(a, b);
    expect(changed.has("tracker")).toBe(true);
  });

  it("detects rules changes", () => {
    const a = makeSavedConfig({ selectedRules: ["general", "testing"] });
    const b = makeSavedConfig({ selectedRules: ["general", "testing", "api"] });
    const changed = computeChangedCategories(a, b);
    expect(changed.has("rules")).toBe(true);
  });

  it("detects hook step changes", () => {
    const a = makeSavedConfig({ selectedHookSteps: ["format", "lint", "test"] });
    const b = makeSavedConfig({ selectedHookSteps: ["format", "lint"] });
    const changed = computeChangedCategories(a, b);
    expect(changed.has("hooks")).toBe(true);
  });

  it("detects skill changes", () => {
    const a = makeSavedConfig({ selectedSkills: ["testing", "commit"] });
    const b = makeSavedConfig({ selectedSkills: ["testing"] });
    const changed = computeChangedCategories(a, b);
    expect(changed.has("skills")).toBe(true);
  });

  it("detects agent teams toggle", () => {
    const a = makeSavedConfig({ agentTeamsEnabled: false });
    const b = makeSavedConfig({ agentTeamsEnabled: true });
    const changed = computeChangedCategories(a, b);
    expect(changed.has("teams")).toBe(true);
  });

  it("detects package manager change", () => {
    const a = makeSavedConfig({ pm: "npm" });
    const b = makeSavedConfig({ pm: "pnpm" });
    const changed = computeChangedCategories(a, b);
    expect(changed.has("pm")).toBe(true);
  });

  it("detects multiple simultaneous changes", () => {
    const a = makeSavedConfig({ selectedMcps: ["taskmaster"], pm: "npm" });
    const b = makeSavedConfig({ selectedMcps: ["taskmaster", "context7"], pm: "bun" });
    const changed = computeChangedCategories(a, b);
    expect(changed.has("mcp")).toBe(true);
    expect(changed.has("pm")).toBe(true);
    expect(changed.size).toBe(2);
  });

  it("ignores array order differences (same elements, different order)", () => {
    const a = makeSavedConfig({ selectedMcps: ["context7", "taskmaster"] });
    const b = makeSavedConfig({ selectedMcps: ["taskmaster", "context7"] });
    expect(computeChangedCategories(a, b).size).toBe(0);
  });
});
