import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig, FileDescriptor, PackageManager, ToolChain } from "../types.js";

/** Build PM-aware hook step snippets for Node.js projects. */
function buildNodeStepSnippets(
  pm: PackageManager
): Record<string, { label: string; script: string }> {
  return {
    format: {
      label: "Format",
      script: `${pm.runIfPresent} format 2>/dev/null || true`,
    },
    lint: {
      label: "Lint (fail on errors)",
      script: `${pm.runIfPresent} lint || { echo "BLOCK: Lint errors found. Fix before committing."; exit 1; }`,
    },
    typecheck: {
      label: "Type-check",
      script: `${pm.runIfPresent} typecheck || { echo "BLOCK: Type errors found. Fix before committing."; exit 1; }`,
    },
    build: {
      label: "Build",
      script: `${pm.runIfPresent} build || { echo "BLOCK: Build failed. Fix before committing."; exit 1; }`,
    },
    test: {
      label: "Test",
      script: `${pm.test} --if-present || { echo "BLOCK: Tests failing. Fix before committing."; exit 1; }`,
    },
  };
}

/** Build toolchain-aware hook step snippets for non-Node languages (F19). */
function buildToolChainStepSnippets(
  tc: ToolChain
): Record<string, { label: string; script: string }> {
  const snippets: Record<string, { label: string; script: string }> = {};

  if (tc.format) {
    snippets.format = {
      label: "Format",
      script: `${tc.format} || { echo "BLOCK: Format failed. Fix before committing."; exit 1; }`,
    };
  }

  if (tc.lint) {
    snippets.lint = {
      label: "Lint (fail on errors)",
      script: `${tc.lint} || { echo "BLOCK: Lint errors found. Fix before committing."; exit 1; }`,
    };
  }

  if (tc.typecheck) {
    snippets.typecheck = {
      label: "Type-check",
      script: `${tc.typecheck} || { echo "BLOCK: Type errors found. Fix before committing."; exit 1; }`,
    };
  }

  if (tc.build) {
    snippets.build = {
      label: "Build",
      script: `${tc.build} || { echo "BLOCK: Build failed. Fix before committing."; exit 1; }`,
    };
  }

  if (tc.test) {
    snippets.test = {
      label: "Test",
      script: `${tc.test} || { echo "BLOCK: Tests failing. Fix before committing."; exit 1; }`,
    };
  }

  return snippets;
}

/**
 * Build step snippets based on the project's toolchain.
 * Node.js projects use PM-aware --if-present pattern.
 * Other languages use direct toolchain commands.
 */
function buildStepSnippets(
  config: ProjectConfig
): Record<string, { label: string; script: string }> {
  if (config.toolchain.language === "node") {
    return buildNodeStepSnippets(config.pm);
  }
  return buildToolChainStepSnippets(config.toolchain);
}

/**
 * Build the pre-commit.sh script dynamically from selected hook steps.
 */
function buildPreCommitScript(selectedSteps: string[], config: ProjectConfig): string {
  const lines = [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    'echo "Running quality gate before commit..."',
    "",
  ];

  const snippets = buildStepSnippets(config);
  selectedSteps.forEach((step, idx) => {
    const snippet = snippets[step];
    if (!snippet) return;
    lines.push(`# ${idx + 1}. ${snippet.label}`);
    lines.push(snippet.script);
    lines.push("");
  });

  lines.push('echo "Quality gate passed."');
  lines.push("");
  return lines.join("\n");
}

/**
 * Generate .claude/hooks/ files and the corresponding settings.json hook config.
 *
 * Produces:
 * 1. .claude/hooks/pre-commit.sh — the quality gate script (marked executable)
 *    Built dynamically from config.selectedHookSteps (F13).
 *    Uses toolchain-aware commands for non-Node languages (F19).
 * 2. .claude/settings.json — hook matcher config that triggers pre-commit.sh
 *    on `Bash(git commit)` events
 *
 * If a .claude/settings.json already exists in the target project, the hooks
 * entry is merged into it. Otherwise a new settings file is created.
 *
 * Implements F3 (Hooks generation), F13 (Granular opt-in), and F19 (Polyglot) from the PRD.
 */
export async function generateHooks(config: ProjectConfig): Promise<FileDescriptor[]> {
  const defaultSteps = Object.keys(buildStepSnippets(config));
  const selectedSteps = config.selectedHookSteps ?? defaultSteps;

  // Build pre-commit script dynamically from selected steps
  const preCommitContent = buildPreCommitScript(selectedSteps, config);

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
