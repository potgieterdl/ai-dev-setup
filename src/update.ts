import { select, checkbox } from "@inquirer/prompts";
import type { ProjectConfig, SavedConfig, TaskTracker, PackageManagerName } from "./types.js";
import { readSavedConfig, writeSavedConfig, backupFiles } from "./utils.js";
import { MCP_REGISTRY } from "./registry.js";
import { runPostCreate } from "./phases/post-create.js";
import { defaultConfig } from "./defaults.js";
import { PACKAGE_MANAGERS, isValidPmName } from "./pm.js";
import { buildToolChain, detectLanguage } from "./toolchain.js";

/** Files that should be backed up before destructive changes, keyed by change category. */
const DESTRUCTIVE_FILE_MAP: Record<string, string[]> = {
  mcp: [".mcp.json", ".vscode/mcp.json"],
  tracker: ["CLAUDE.md", "CLAUDE_MCP.md"],
  rules: [".claude/rules/"],
  skills: [".claude/skills/"],
  hooks: [".claude/hooks/pre-commit.sh", ".claude/settings.json"],
  teams: [".claude/rules/agent-teams.md"],
  pm: [".claude/hooks/pre-commit.sh", "CLAUDE.md", ".devcontainer/devcontainer.json"],
};

/** Convert a SavedConfig back into a ProjectConfig for regeneration. */
function savedToProjectConfig(saved: SavedConfig, projectRoot: string): ProjectConfig {
  const base = defaultConfig(projectRoot);
  const pm = PACKAGE_MANAGERS[saved.pm] ?? PACKAGE_MANAGERS.npm;
  const language = detectLanguage(projectRoot);
  return {
    ...base,
    selectedMcps: saved.selectedMcps,
    taskTracker: saved.taskTracker,
    architecture: saved.architecture,
    agentTeamsEnabled: saved.agentTeamsEnabled,
    selectedRules: saved.selectedRules,
    selectedHookSteps: saved.selectedHookSteps,
    selectedSkills: saved.selectedSkills,
    pm,
    toolchain: buildToolChain(language, pm),
    hasApiDocs: saved.selectedRules.includes("api"),
    hasDatabase: saved.selectedRules.includes("database"),
  };
}

/** Compute which generator categories need to re-run based on config diff. */
export function computeChangedCategories(prev: SavedConfig, next: SavedConfig): Set<string> {
  const changed = new Set<string>();

  const arrSame = (a: string[], b: string[]): boolean =>
    a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

  if (!arrSame(prev.selectedMcps, next.selectedMcps)) changed.add("mcp");
  if (prev.taskTracker !== next.taskTracker) changed.add("tracker");
  if (!arrSame(prev.selectedRules, next.selectedRules)) changed.add("rules");
  if (!arrSame(prev.selectedHookSteps, next.selectedHookSteps)) changed.add("hooks");
  if (!arrSame(prev.selectedSkills, next.selectedSkills)) changed.add("skills");
  if (prev.agentTeamsEnabled !== next.agentTeamsEnabled) changed.add("teams");
  if (prev.pm !== next.pm) changed.add("pm");

  return changed;
}

/** Typed flags that the update command accepts from the CLI. */
interface UpdateFlags {
  addMcp?: string;
  removeMcp?: string;
  tracker?: string;
  addRule?: string;
  removeRule?: string;
  enableTeams?: boolean;
  disableTeams?: boolean;
  pm?: string;
}

/** Check if any CLI flags for the update command were provided. */
function hasUpdateFlags(flags: UpdateFlags): boolean {
  return !!(
    flags.addMcp ||
    flags.removeMcp ||
    flags.tracker ||
    flags.addRule ||
    flags.removeRule ||
    flags.enableTeams ||
    flags.disableTeams ||
    flags.pm
  );
}

/**
 * Apply non-interactive CLI flag changes to a SavedConfig.
 * Returns true if any changes were made.
 */
function applyFlags(saved: SavedConfig, flags: UpdateFlags): boolean {
  let changed = false;

  if (flags.addMcp) {
    const known = MCP_REGISTRY.map((s) => s.name);
    if (!known.includes(flags.addMcp)) {
      console.error(
        `[ai-init update] Unknown MCP server: "${flags.addMcp}". Known: ${known.join(", ")}`
      );
      process.exit(1);
    }
    if (!saved.selectedMcps.includes(flags.addMcp)) {
      saved.selectedMcps = [...saved.selectedMcps, flags.addMcp];
      changed = true;
    }
  }

  if (flags.removeMcp) {
    if (saved.selectedMcps.includes(flags.removeMcp)) {
      saved.selectedMcps = saved.selectedMcps.filter((m) => m !== flags.removeMcp);
      changed = true;
    }
  }

  if (flags.tracker) {
    const valid: TaskTracker[] = ["taskmaster", "beads", "markdown"];
    if (!valid.includes(flags.tracker as TaskTracker)) {
      console.error(
        `[ai-init update] Invalid tracker: "${flags.tracker}". Valid: ${valid.join(", ")}`
      );
      process.exit(1);
    }
    if (saved.taskTracker !== flags.tracker) {
      saved.taskTracker = flags.tracker as TaskTracker;
      // Ensure MCP alignment
      if (saved.taskTracker === "taskmaster" && !saved.selectedMcps.includes("taskmaster")) {
        saved.selectedMcps.push("taskmaster");
      }
      if (saved.taskTracker === "beads" && !saved.selectedMcps.includes("beads")) {
        saved.selectedMcps.push("beads");
      }
      changed = true;
    }
  }

  if (flags.addRule) {
    if (!saved.selectedRules.includes(flags.addRule)) {
      saved.selectedRules = [...saved.selectedRules, flags.addRule];
      changed = true;
    }
  }

  if (flags.removeRule) {
    if (saved.selectedRules.includes(flags.removeRule)) {
      saved.selectedRules = saved.selectedRules.filter((r) => r !== flags.removeRule);
      changed = true;
    }
  }

  if (flags.enableTeams && !saved.agentTeamsEnabled) {
    saved.agentTeamsEnabled = true;
    changed = true;
  }

  if (flags.disableTeams && saved.agentTeamsEnabled) {
    saved.agentTeamsEnabled = false;
    changed = true;
  }

  if (flags.pm) {
    if (!isValidPmName(flags.pm)) {
      console.error(
        `[ai-init update] Invalid package manager: "${flags.pm}". Valid: npm, pnpm, yarn, bun`
      );
      process.exit(1);
    }
    if (saved.pm !== flags.pm) {
      saved.pm = flags.pm as PackageManagerName;
      changed = true;
    }
  }

  return changed;
}

/**
 * Run the interactive update dashboard.
 * Shows current config and offers individual changes.
 * Mutates `saved` in-place and returns true if changes were made.
 */
async function runInteractiveUpdate(saved: SavedConfig): Promise<boolean> {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  AI Project Init — Update Dashboard");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(`  MCP Servers:      ${saved.selectedMcps.join(", ") || "none"}`);
  console.log(`  Task Tracker:     ${saved.taskTracker}`);
  console.log(`  Architecture:     ${saved.architecture}`);
  console.log(`  Rules:            ${saved.selectedRules.join(", ") || "all defaults"}`);
  console.log(`  Hook Steps:       ${saved.selectedHookSteps.join(", ") || "all defaults"}`);
  console.log(`  Skills:           ${saved.selectedSkills.join(", ") || "all defaults"}`);
  console.log(`  Package Manager:  ${saved.pm}`);
  console.log(`  Agent Teams:      ${saved.agentTeamsEnabled ? "enabled" : "disabled"}`);
  console.log("");

  const action = await select({
    message: "What would you like to change?",
    choices: [
      { name: "Add/remove MCP servers", value: "mcp" },
      { name: "Switch task tracker", value: "tracker" },
      { name: "Add/remove rules", value: "rules" },
      { name: "Toggle agent teams", value: "teams" },
      { name: "Change package manager", value: "pm" },
      { name: "Exit without changes", value: "exit" },
    ],
  });

  if (action === "exit") return false;

  switch (action) {
    case "mcp": {
      const choices = MCP_REGISTRY.map((s) => ({
        name: `${s.name} — ${s.description}`,
        value: s.name,
        checked: saved.selectedMcps.includes(s.name),
      }));
      saved.selectedMcps = await checkbox({
        message: "Select MCP servers:",
        choices,
      });
      return true;
    }

    case "tracker": {
      saved.taskTracker = (await select({
        message: "Choose a task tracker:",
        choices: [
          {
            name: "Task Master (subtasks, research, complexity analysis)",
            value: "taskmaster",
          },
          {
            name: "Beads (multi-agent, git-native issue tracking)",
            value: "beads",
          },
          {
            name: "Simple Markdown (for small projects, ≤20 tasks)",
            value: "markdown",
          },
        ],
        default: saved.taskTracker,
      })) as TaskTracker;
      // Ensure MCP alignment
      if (saved.taskTracker === "taskmaster" && !saved.selectedMcps.includes("taskmaster")) {
        saved.selectedMcps.push("taskmaster");
      }
      if (saved.taskTracker === "beads" && !saved.selectedMcps.includes("beads")) {
        saved.selectedMcps.push("beads");
      }
      return true;
    }

    case "rules": {
      const allRules = [
        "general",
        "docs",
        "testing",
        "git",
        "security",
        "config",
        "api",
        "database",
      ];
      const choices = allRules.map((r) => ({
        name: r,
        value: r,
        checked: saved.selectedRules.includes(r),
      }));
      saved.selectedRules = await checkbox({
        message: "Select rules to generate:",
        choices,
      });
      return true;
    }

    case "teams": {
      saved.agentTeamsEnabled = !saved.agentTeamsEnabled;
      console.log(`  Agent teams: ${saved.agentTeamsEnabled ? "enabled" : "disabled"}`);
      return true;
    }

    case "pm": {
      saved.pm = (await select({
        message: "Choose package manager:",
        choices: [
          { name: "npm", value: "npm" },
          { name: "pnpm", value: "pnpm" },
          { name: "yarn", value: "yarn" },
          { name: "bun", value: "bun" },
        ],
        default: saved.pm,
      })) as PackageManagerName;
      return true;
    }
  }

  return false;
}

/**
 * Main entry point for the `ai-init update` subcommand (F16).
 *
 * Reads .ai-init.json, applies changes (from CLI flags or interactive dashboard),
 * diffs against the previous config, backs up affected files, and regenerates
 * only what changed.
 */
export async function runUpdate(
  projectRoot: string,
  flags: Record<string, unknown>
): Promise<void> {
  const saved = await readSavedConfig(projectRoot);

  if (!saved) {
    console.error(
      "[ai-init update] No .ai-init.json found. Run `ai-init` first to generate initial config."
    );
    process.exit(1);
  }

  // Clone saved config so we can detect diffs
  const original: SavedConfig = JSON.parse(JSON.stringify(saved));
  let changed: boolean;

  if (hasUpdateFlags(flags as UpdateFlags)) {
    // Non-interactive: apply CLI flags
    changed = applyFlags(saved, flags as UpdateFlags);
  } else {
    // Interactive: show dashboard
    changed = await runInteractiveUpdate(saved);
  }

  if (!changed) {
    console.log("[ai-init update] No changes detected.");
    return;
  }

  // Compute what changed
  const changedCategories = computeChangedCategories(original, saved);
  if (changedCategories.size === 0) {
    console.log("[ai-init update] No changes detected.");
    return;
  }

  console.log(`[ai-init update] Changed categories: ${[...changedCategories].join(", ")}`);

  // Backup files that will be overwritten
  const toBackup = [...changedCategories]
    .flatMap((cat) => DESTRUCTIVE_FILE_MAP[cat] ?? [])
    .filter((p) => !p.startsWith("~"));
  if (toBackup.length > 0) {
    const backupDir = await backupFiles(projectRoot, toBackup);
    console.log(`[ai-init update] Backed up affected files to ${backupDir}`);
  }

  // Build a ProjectConfig from updated saved state and run full regeneration
  const config = savedToProjectConfig(saved, projectRoot);
  const written = await runPostCreate(config, /* overwrite= */ true);

  // Persist the updated config
  saved.generatedAt = new Date().toISOString();
  await writeSavedConfig(projectRoot, saved);

  console.log(`[ai-init update] Done. ${written.length} files regenerated.`);
}
