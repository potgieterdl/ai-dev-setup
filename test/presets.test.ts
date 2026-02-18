import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  BUILTIN_PRESETS,
  loadPreset,
  savePreset,
  listPresets,
  exportPreset,
  importPreset,
  applyPreset,
  ensurePresetsDir,
} from "../src/presets.js";
import { defaultConfig } from "../src/defaults.js";
import type { PresetConfig, Preset } from "../src/types.js";

/** Create an isolated temp directory for each test that needs disk I/O. */
async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "presets-test-"));
}

/** A minimal valid PresetConfig for use in test fixtures. */
const mockPresetConfig: PresetConfig = {
  selectedMcps: ["taskmaster", "context7"],
  taskTracker: "taskmaster",
  architecture: "3-tier",
  agentTeamsEnabled: false,
  generateDocs: true,
  generateRules: true,
  generateSkills: true,
  generateHooks: true,
  generateCommands: true,
  hasApiDocs: true,
  hasDatabase: true,
  selectedRules: ["general", "api", "database"],
  selectedSkills: ["testing", "commit"],
  selectedHookSteps: ["format", "lint", "build"],
  pm: "pnpm",
};

describe("BUILTIN_PRESETS", () => {
  it("ships exactly 3 built-in presets", () => {
    expect(BUILTIN_PRESETS).toHaveLength(3);
  });

  it("includes minimal, standard, and full", () => {
    const names = BUILTIN_PRESETS.map((p) => p.name);
    expect(names).toContain("minimal");
    expect(names).toContain("standard");
    expect(names).toContain("full");
  });

  it("minimal preset has only taskmaster MCP", () => {
    const minimal = BUILTIN_PRESETS.find((p) => p.name === "minimal")!;
    expect(minimal.config.selectedMcps).toEqual(["taskmaster"]);
  });

  it("minimal preset uses markdown tracker", () => {
    const minimal = BUILTIN_PRESETS.find((p) => p.name === "minimal")!;
    expect(minimal.config.taskTracker).toBe("markdown");
  });

  it("full preset has agentTeamsEnabled true", () => {
    const full = BUILTIN_PRESETS.find((p) => p.name === "full")!;
    expect(full.config.agentTeamsEnabled).toBe(true);
  });

  it("standard preset has taskmaster tracker with context7 MCP", () => {
    const standard = BUILTIN_PRESETS.find((p) => p.name === "standard")!;
    expect(standard.config.taskTracker).toBe("taskmaster");
    expect(standard.config.selectedMcps).toContain("context7");
  });

  it("every built-in preset has a non-empty description", () => {
    for (const preset of BUILTIN_PRESETS) {
      expect(preset.description.length).toBeGreaterThan(0);
    }
  });
});

describe("ensurePresetsDir", () => {
  it("creates the directory if it does not exist", async () => {
    const tmp = await makeTempDir();
    const nested = path.join(tmp, "nested", "presets");
    await ensurePresetsDir(nested);
    const stat = await fs.stat(nested);
    expect(stat.isDirectory()).toBe(true);
    await fs.rm(tmp, { recursive: true });
  });

  it("does not throw if the directory already exists", async () => {
    const tmp = await makeTempDir();
    await ensurePresetsDir(tmp);
    await expect(ensurePresetsDir(tmp)).resolves.toBeUndefined();
    await fs.rm(tmp, { recursive: true });
  });
});

describe("loadPreset", () => {
  it("returns built-in preset without disk access", async () => {
    const result = await loadPreset("standard", "/tmp/nonexistent-dir");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("standard");
  });

  it("returns null for unknown preset name", async () => {
    const tmp = await makeTempDir();
    const result = await loadPreset("nonexistent", tmp);
    expect(result).toBeNull();
    await fs.rm(tmp, { recursive: true });
  });

  it("loads user preset from disk", async () => {
    const tmp = await makeTempDir();
    const preset: Preset = {
      name: "custom",
      description: "Custom preset",
      config: mockPresetConfig,
    };
    await fs.writeFile(path.join(tmp, "custom.json"), JSON.stringify(preset));
    const result = await loadPreset("custom", tmp);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("custom");
    expect(result!.config.selectedMcps).toEqual(mockPresetConfig.selectedMcps);
    await fs.rm(tmp, { recursive: true });
  });

  it("built-in takes priority over user preset with same name", async () => {
    // loadPreset checks built-ins first, so built-in "standard" should win
    const tmp = await makeTempDir();
    const override: Preset = { name: "standard", description: "CUSTOM", config: mockPresetConfig };
    await fs.writeFile(path.join(tmp, "standard.json"), JSON.stringify(override));
    const result = await loadPreset("standard", tmp);
    // Built-in description is different from "CUSTOM"
    expect(result!.description).not.toBe("CUSTOM");
    await fs.rm(tmp, { recursive: true });
  });
});

describe("savePreset", () => {
  it("writes JSON file to disk", async () => {
    const tmp = await makeTempDir();
    const mockConfig = defaultConfig("/tmp/proj");
    await savePreset("my-preset", mockConfig, "My test preset", tmp);
    const raw = await fs.readFile(path.join(tmp, "my-preset.json"), "utf8");
    const parsed = JSON.parse(raw) as Preset;
    expect(parsed.name).toBe("my-preset");
    expect(parsed.description).toBe("My test preset");
    expect(parsed.config.selectedMcps).toEqual(mockConfig.selectedMcps);
    expect(parsed.config.taskTracker).toBe(mockConfig.taskTracker);
    expect(parsed.config.pm).toBe(mockConfig.pm.name);
    await fs.rm(tmp, { recursive: true });
  });

  it("creates the presets directory if it does not exist", async () => {
    const tmp = await makeTempDir();
    const nested = path.join(tmp, "deep", "presets");
    const mockConfig = defaultConfig("/tmp/proj");
    await savePreset("nested-preset", mockConfig, "", nested);
    const stat = await fs.stat(nested);
    expect(stat.isDirectory()).toBe(true);
    await fs.rm(tmp, { recursive: true });
  });
});

describe("listPresets", () => {
  it("includes all 3 built-ins for empty dir", async () => {
    const tmp = await makeTempDir();
    const presets = await listPresets(tmp);
    const names = presets.map((p) => p.name);
    expect(names).toContain("minimal");
    expect(names).toContain("standard");
    expect(names).toContain("full");
    await fs.rm(tmp, { recursive: true });
  });

  it("includes user presets alongside built-ins", async () => {
    const tmp = await makeTempDir();
    const custom: Preset = { name: "custom", description: "x", config: mockPresetConfig };
    await fs.writeFile(path.join(tmp, "custom.json"), JSON.stringify(custom));
    const presets = await listPresets(tmp);
    const names = presets.map((p) => p.name);
    expect(names).toContain("custom");
    expect(names).toContain("standard");
    expect(names).toContain("minimal");
    await fs.rm(tmp, { recursive: true });
  });

  it("user preset shadows built-in with same name", async () => {
    const tmp = await makeTempDir();
    const customMinimal: Preset = {
      name: "minimal",
      description: "Custom minimal",
      config: mockPresetConfig,
    };
    await fs.writeFile(path.join(tmp, "minimal.json"), JSON.stringify(customMinimal));
    const presets = await listPresets(tmp);
    const minimal = presets.find((p) => p.name === "minimal")!;
    expect(minimal.description).toBe("Custom minimal");
    await fs.rm(tmp, { recursive: true });
  });

  it("skips malformed JSON files without throwing", async () => {
    const tmp = await makeTempDir();
    await fs.writeFile(path.join(tmp, "bad.json"), "not json{{{");
    const presets = await listPresets(tmp);
    expect(presets.every((p) => p.name !== "bad")).toBe(true);
    await fs.rm(tmp, { recursive: true });
  });

  it("returns built-ins if presets directory does not exist", async () => {
    const presets = await listPresets("/tmp/nonexistent-presets-dir-" + Date.now());
    expect(presets.length).toBe(3);
  });
});

describe("exportPreset", () => {
  it("returns valid JSON string for built-in", async () => {
    const json = await exportPreset("minimal");
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe("minimal");
    expect(parsed.config).toBeDefined();
  });

  it("throws for unknown preset", async () => {
    const tmp = await makeTempDir();
    await expect(exportPreset("no-such-preset", tmp)).rejects.toThrow('"no-such-preset" not found');
    await fs.rm(tmp, { recursive: true });
  });
});

describe("importPreset", () => {
  it("writes file to presets dir and returns preset", async () => {
    const tmp = await makeTempDir();
    const srcFile = path.join(tmp, "team-acme.json");
    const preset: Preset = {
      name: "team-acme",
      description: "Team preset",
      config: mockPresetConfig,
    };
    await fs.writeFile(srcFile, JSON.stringify(preset));

    const destDir = path.join(tmp, "dest");
    const imported = await importPreset(srcFile, destDir);
    expect(imported.name).toBe("team-acme");

    const saved = await fs.readFile(path.join(destDir, "team-acme.json"), "utf8");
    expect(JSON.parse(saved).name).toBe("team-acme");
    await fs.rm(tmp, { recursive: true });
  });

  it("throws on invalid preset file structure", async () => {
    const tmp = await makeTempDir();
    const badFile = path.join(tmp, "bad.json");
    await fs.writeFile(badFile, JSON.stringify({ description: "missing name and config" }));
    await expect(importPreset(badFile, tmp)).rejects.toThrow("Invalid preset file");
    await fs.rm(tmp, { recursive: true });
  });
});

describe("applyPreset", () => {
  it("merges preset config onto base ProjectConfig", () => {
    const base = defaultConfig("/tmp/proj");
    const preset = BUILTIN_PRESETS.find((p) => p.name === "full")!;
    const result = applyPreset(preset, base);
    expect(result.agentTeamsEnabled).toBe(true);
    expect(result.selectedMcps).toContain("browsermcp");
    expect(result.hasApiDocs).toBe(true);
    expect(result.hasDatabase).toBe(true);
  });

  it("preserves runtime fields from base config", () => {
    const base = defaultConfig("/tmp/my-project");
    const preset = BUILTIN_PRESETS.find((p) => p.name === "minimal")!;
    const result = applyPreset(preset, base);
    expect(result.projectRoot).toBe("/tmp/my-project");
    expect(result.projectName).toBe("my-project");
    expect(result.generatedFiles).toEqual([]);
  });

  it("applies pm from preset config when valid", () => {
    const base = defaultConfig("/tmp/proj");
    const presetWithPm: Preset = {
      name: "with-pnpm",
      description: "test",
      config: { ...mockPresetConfig, pm: "pnpm" },
    };
    const result = applyPreset(presetWithPm, base);
    expect(result.pm.name).toBe("pnpm");
  });

  it("does not mutate the base config object", () => {
    const base = defaultConfig("/tmp/proj");
    const originalMcps = [...base.selectedMcps];
    const preset = BUILTIN_PRESETS.find((p) => p.name === "full")!;
    applyPreset(preset, base);
    expect(base.selectedMcps).toEqual(originalMcps);
  });
});
