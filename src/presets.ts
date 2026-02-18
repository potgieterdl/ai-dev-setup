/**
 * Preset/Profile system (F18) — save, load, list, export, and import wizard configurations.
 *
 * Built-in presets are embedded as constants. User presets are stored as JSON files
 * in ~/.ai-dev-setup/presets/. User presets shadow built-ins with the same name.
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { Preset, PresetConfig, ProjectConfig, PackageManagerName } from "./types.js";
import { PACKAGE_MANAGERS, isValidPmName } from "./pm.js";

/** Default directory for user-saved presets */
export const PRESETS_DIR = path.join(os.homedir(), ".ai-dev-setup", "presets");

// ─── Built-in presets (embedded, not read from disk) ────────────────────────

export const BUILTIN_PRESETS: Preset[] = [
  {
    name: "minimal",
    description: "Quick start — Taskmaster + markdown tracker, minimal rules",
    config: {
      selectedMcps: ["taskmaster"],
      taskTracker: "markdown",
      architecture: "skip",
      agentTeamsEnabled: false,
      generateDocs: true,
      generateRules: true,
      generateSkills: false,
      generateHooks: false,
      generateCommands: true,
      hasApiDocs: false,
      hasDatabase: false,
      selectedRules: ["general", "git"],
      selectedSkills: [],
      selectedHookSteps: [],
    },
  },
  {
    name: "standard",
    description: "Recommended — Taskmaster + Context7, common rules and skills",
    config: {
      selectedMcps: ["taskmaster", "context7"],
      taskTracker: "taskmaster",
      architecture: "skip",
      agentTeamsEnabled: false,
      generateDocs: true,
      generateRules: true,
      generateSkills: true,
      generateHooks: true,
      generateCommands: true,
      hasApiDocs: false,
      hasDatabase: false,
      selectedRules: ["general", "testing", "git", "security", "config"],
      selectedSkills: ["testing", "commit", "task-workflow"],
      selectedHookSteps: ["format", "lint", "typecheck", "build", "test"],
    },
  },
  {
    name: "full",
    description: "Everything enabled — all MCPs, all rules, agent teams",
    config: {
      selectedMcps: ["taskmaster", "context7", "browsermcp", "beads", "sequential-thinking"],
      taskTracker: "taskmaster",
      architecture: "skip",
      agentTeamsEnabled: true,
      generateDocs: true,
      generateRules: true,
      generateSkills: true,
      generateHooks: true,
      generateCommands: true,
      hasApiDocs: true,
      hasDatabase: true,
      selectedRules: ["general", "testing", "git", "security", "api", "database", "config", "docs"],
      selectedSkills: ["testing", "commit", "task-workflow"],
      selectedHookSteps: ["format", "lint", "typecheck", "build", "test"],
    },
  },
];

// ─── Directory management ────────────────────────────────────────────────────

export async function ensurePresetsDir(dir: string = PRESETS_DIR): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

// ─── Load / Save ─────────────────────────────────────────────────────────────

/**
 * Load a preset by name. Checks built-ins first, then user presets on disk.
 * Returns null if not found.
 */
export async function loadPreset(name: string, dir: string = PRESETS_DIR): Promise<Preset | null> {
  // Check built-ins first
  const builtin = BUILTIN_PRESETS.find((p) => p.name === name);
  if (builtin) return builtin;

  // Fall back to user-saved presets on disk
  const filePath = path.join(dir, `${name}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as Preset;
  } catch {
    return null;
  }
}

/**
 * Save a wizard config as a named preset to disk.
 */
export async function savePreset(
  name: string,
  config: ProjectConfig,
  description = "",
  dir: string = PRESETS_DIR
): Promise<void> {
  await ensurePresetsDir(dir);
  const preset: Preset = {
    name,
    description,
    config: extractPresetConfig(config),
  };
  const filePath = path.join(dir, `${name}.json`);
  await fs.writeFile(filePath, JSON.stringify(preset, null, 2), "utf8");
}

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List all presets: built-ins + user-saved. User presets shadow built-ins with the same name.
 */
export async function listPresets(dir: string = PRESETS_DIR): Promise<Preset[]> {
  const userPresets = await loadUserPresets(dir);
  // User presets shadow built-ins with the same name
  const userNames = new Set(userPresets.map((p) => p.name));
  const builtins = BUILTIN_PRESETS.filter((p) => !userNames.has(p.name));
  return [...builtins, ...userPresets];
}

async function loadUserPresets(dir: string): Promise<Preset[]> {
  try {
    const files = await fs.readdir(dir);
    const presets: Preset[] = [];
    for (const file of files.filter((f) => f.endsWith(".json"))) {
      try {
        const raw = await fs.readFile(path.join(dir, file), "utf8");
        presets.push(JSON.parse(raw) as Preset);
      } catch {
        // Skip malformed files
      }
    }
    return presets;
  } catch {
    return [];
  }
}

// ─── Export / Import ──────────────────────────────────────────────────────────

/**
 * Export a preset as a JSON string. Works with both built-ins and user presets.
 */
export async function exportPreset(name: string, dir: string = PRESETS_DIR): Promise<string> {
  const preset = await loadPreset(name, dir);
  if (!preset) throw new Error(`Preset "${name}" not found.`);
  return JSON.stringify(preset, null, 2);
}

/**
 * Import a preset from a JSON file path into the presets directory.
 */
export async function importPreset(filePath: string, dir: string = PRESETS_DIR): Promise<Preset> {
  const raw = await fs.readFile(filePath, "utf8");
  const preset = JSON.parse(raw) as Preset;
  if (!preset.name || !preset.config) {
    throw new Error('Invalid preset file: missing "name" or "config" fields.');
  }
  await ensurePresetsDir(dir);
  await fs.writeFile(path.join(dir, `${preset.name}.json`), raw, "utf8");
  return preset;
}

// ─── Apply preset → ProjectConfig ─────────────────────────────────────────────

/**
 * Merge a preset's config onto a base ProjectConfig, preserving runtime fields
 * like projectRoot, projectName, and generatedFiles.
 */
export function applyPreset(preset: Preset, base: ProjectConfig): ProjectConfig {
  const result = { ...base };
  const c = preset.config;

  result.selectedMcps = c.selectedMcps;
  result.taskTracker = c.taskTracker;
  result.architecture = c.architecture;
  result.agentTeamsEnabled = c.agentTeamsEnabled;
  result.generateDocs = c.generateDocs;
  result.generateRules = c.generateRules;
  result.generateSkills = c.generateSkills;
  result.generateHooks = c.generateHooks;
  result.generateCommands = c.generateCommands;
  result.hasApiDocs = c.hasApiDocs;
  result.hasDatabase = c.hasDatabase;
  result.selectedRules = c.selectedRules;
  result.selectedSkills = c.selectedSkills;
  result.selectedHookSteps = c.selectedHookSteps;

  // Restore pm from preset if provided
  if (c.pm && isValidPmName(c.pm)) {
    result.pm = PACKAGE_MANAGERS[c.pm];
  }

  return result;
}

// ─── Extract saveable fields from ProjectConfig ───────────────────────────────

function extractPresetConfig(config: ProjectConfig): PresetConfig {
  return {
    selectedMcps: config.selectedMcps,
    taskTracker: config.taskTracker,
    architecture: config.architecture,
    agentTeamsEnabled: config.agentTeamsEnabled,
    generateDocs: config.generateDocs,
    generateRules: config.generateRules,
    generateSkills: config.generateSkills,
    generateHooks: config.generateHooks,
    generateCommands: config.generateCommands,
    hasApiDocs: config.hasApiDocs,
    hasDatabase: config.hasDatabase,
    selectedRules: config.selectedRules,
    selectedSkills: config.selectedSkills,
    selectedHookSteps: config.selectedHookSteps,
    pm: config.pm.name as PackageManagerName,
  };
}
