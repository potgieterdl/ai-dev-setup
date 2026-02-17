import { run, commandExists } from "../utils.js";

/**
 * On-create phase — heavy installs, called once during Codespace creation.
 *
 * This phase runs as the `onCreateCommand` in devcontainer.json.
 * It installs global npm packages (Claude Code, Task Master) that are
 * required for the AI-assisted development workflow.
 *
 * Idempotent: skips installation if the tool is already on PATH.
 */
export async function runOnCreate(): Promise<void> {
  console.log("[ai-init] Phase: on-create — installing global tools...");

  // Install Claude Code if not present
  if (!(await commandExists("claude"))) {
    console.log("[ai-init] Installing Claude Code...");
    await run("npm", ["install", "-g", "@anthropic-ai/claude-code"]);
    console.log("[ai-init] Claude Code installed.");
  } else {
    console.log("[ai-init] Claude Code already installed, skipping.");
  }

  // Install Task Master if not present
  if (!(await commandExists("task-master"))) {
    console.log("[ai-init] Installing Task Master...");
    await run("npm", ["install", "-g", "task-master-ai"]);
    console.log("[ai-init] Task Master installed.");
  } else {
    console.log("[ai-init] Task Master already installed, skipping.");
  }

  console.log("[ai-init] on-create complete.");
}
