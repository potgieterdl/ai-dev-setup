import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectConfig, FileDescriptor } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/hooks");

/**
 * Generate .claude/hooks/ files and the corresponding settings.json hook config.
 *
 * Produces:
 * 1. .claude/hooks/pre-commit.sh — the quality gate script (marked executable)
 * 2. .claude/settings.json — hook matcher config that triggers pre-commit.sh
 *    on `Bash(git commit)` events
 *
 * If a .claude/settings.json already exists in the target project, the hooks
 * entry is merged into it. Otherwise a new settings file is created.
 *
 * Implements F3 (Hooks generation) from the PRD.
 */
export async function generateHooks(config: ProjectConfig): Promise<FileDescriptor[]> {
  // Read the pre-commit hook template
  const preCommitContent = await fs.readFile(path.join(TEMPLATES_DIR, "pre-commit.sh"), "utf8");

  // Build settings.json with hook matcher
  const settingsContent = await buildSettingsJson(config.projectRoot);

  return [
    {
      path: ".claude/hooks/pre-commit.sh",
      content: preCommitContent,
      executable: true,
    },
    {
      path: ".claude/settings.json",
      content: settingsContent,
    },
  ];
}

/**
 * Build .claude/settings.json content, merging with existing settings if present.
 * Adds the PreToolUse hook matcher for git commit interception.
 */
async function buildSettingsJson(projectRoot: string): Promise<string> {
  const settingsPath = path.join(projectRoot, ".claude/settings.json");

  let existing: Record<string, unknown> = {};
  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    existing = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // No existing settings — start fresh
  }

  const hookEntry = {
    matcher: "Bash(git commit)",
    hook: ".claude/hooks/pre-commit.sh",
  };

  // Merge hooks into existing settings
  const hooks = (existing.hooks ?? {}) as Record<string, unknown[]>;
  const preToolUse = (hooks.PreToolUse ?? []) as Array<{ matcher: string; hook: string }>;

  // Avoid duplicating the hook if it already exists
  const alreadyExists = preToolUse.some(
    (h) => h.matcher === hookEntry.matcher && h.hook === hookEntry.hook
  );

  if (!alreadyExists) {
    preToolUse.push(hookEntry);
  }

  const merged = {
    ...existing,
    hooks: {
      ...hooks,
      PreToolUse: preToolUse,
    },
  };

  return JSON.stringify(merged, null, 2) + "\n";
}
