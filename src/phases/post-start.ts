import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig } from "../types.js";
import { readOptional } from "../utils.js";

interface TaskSummary {
  total: number;
  done: number;
  pending: number;
  inProgress: number;
}

/**
 * Count tasks from a Task Master tasks.json file.
 */
function countTaskMasterTasks(raw: string): TaskSummary {
  try {
    const data = JSON.parse(raw) as {
      tasks?: Array<{ status: string }>;
      master?: { tasks?: Array<{ status: string }> };
    };
    // Handle both standard format { tasks: [...] } and tagged format { master: { tasks: [...] } }
    const tasks = data.tasks ?? data.master?.tasks ?? [];
    return {
      total: tasks.length,
      done: tasks.filter((t) => t.status === "done").length,
      pending: tasks.filter((t) => t.status === "pending").length,
      inProgress: tasks.filter((t) => t.status === "in-progress").length,
    };
  } catch {
    return { total: 0, done: 0, pending: 0, inProgress: 0 };
  }
}

/**
 * Count tasks from a simple markdown TASKS.md file.
 * Looks for `| N |` rows with `[x]` (done) or `[ ]` (pending).
 */
function countMarkdownTasks(raw: string): TaskSummary {
  const lines = raw.split("\n");
  let done = 0;
  let pending = 0;

  for (const line of lines) {
    // Match table rows like: | 1 | Task name | [x] | — |
    if (/^\|.*\|.*\[x\].*\|/.test(line)) {
      done++;
    } else if (/^\|.*\|.*\[ \].*\|/.test(line)) {
      pending++;
    }
  }

  return { total: done + pending, done, pending, inProgress: 0 };
}

/**
 * Sync environment variables from Codespace secrets to a .env file.
 * Only writes keys that are not already present in .env.
 */
async function syncEnvFile(projectRoot: string): Promise<void> {
  const envPath = path.join(projectRoot, ".env");
  const existing = (await readOptional(envPath)) ?? "";

  const keysToSync = [
    "ANTHROPIC_API_KEY",
    "PERPLEXITY_API_KEY",
    "OPENAI_API_KEY",
    "GOOGLE_API_KEY",
    "XAI_API_KEY",
    "OPENROUTER_API_KEY",
    "MISTRAL_API_KEY",
    "AZURE_OPENAI_API_KEY",
    "OLLAMA_API_KEY",
  ];

  const newLines: string[] = [];
  for (const key of keysToSync) {
    const value = process.env[key];
    if (value && !existing.includes(`${key}=`)) {
      newLines.push(`${key}=${value}`);
    }
  }

  if (newLines.length > 0) {
    const separator = existing.endsWith("\n") || existing === "" ? "" : "\n";
    await fs.writeFile(envPath, existing + separator + newLines.join("\n") + "\n", "utf8");
    console.log(`[ai-init] Synced ${newLines.length} env var(s) to .env`);
  }
}

/**
 * Post-start phase — per-session setup, called on every Codespace start.
 *
 * This phase runs as the `postStartCommand` in devcontainer.json.
 * It performs three tasks:
 *   1. Sync API keys from Codespace secrets into .env (if not already present)
 *   2. Read task progress from the chosen tracker
 *   3. Print a welcome banner with task summary
 */
export async function runPostStart(config: ProjectConfig): Promise<void> {
  console.log("[ai-init] Phase: post-start — setting up session...");

  // 1. Sync env vars
  await syncEnvFile(config.projectRoot);

  // 2. Read task progress
  let summary: TaskSummary = { total: 0, done: 0, pending: 0, inProgress: 0 };

  if (config.taskTracker === "taskmaster") {
    const tasksPath = path.join(config.projectRoot, ".taskmaster/tasks/tasks.json");
    const raw = await readOptional(tasksPath);
    if (raw) {
      summary = countTaskMasterTasks(raw);
    }
  } else if (config.taskTracker === "markdown") {
    const tasksPath = path.join(config.projectRoot, "TASKS.md");
    const raw = await readOptional(tasksPath);
    if (raw) {
      summary = countMarkdownTasks(raw);
    }
  }
  // beads: no local task file to read — skip summary

  // 3. Print welcome banner
  console.log("");
  console.log("┌─────────────────────────────────────────────┐");
  console.log(`│  ${config.projectName}`);
  console.log("│  AI-assisted development environment ready");
  console.log("├─────────────────────────────────────────────┤");
  if (summary.total > 0) {
    console.log(`│  Tasks: ${summary.done}/${summary.total} done`);
    if (summary.pending > 0) console.log(`│  Pending: ${summary.pending}`);
    if (summary.inProgress > 0) console.log(`│  In progress: ${summary.inProgress}`);
  } else {
    console.log("│  No tasks found yet.");
  }
  console.log(`│  Tracker: ${config.taskTracker}`);
  console.log("└─────────────────────────────────────────────┘");
  console.log("");

  console.log("[ai-init] post-start complete.");
}
