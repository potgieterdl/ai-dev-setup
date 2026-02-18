import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectConfig, FileDescriptor } from "../types.js";
import { fillTemplate } from "../utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = path.resolve(__dirname, "../../templates/commands");

/**
 * Read a command template file from the templates/commands/ directory.
 */
async function readCommand(name: string): Promise<string> {
  return fs.readFile(path.join(COMMANDS_DIR, name), "utf8");
}

/** All command templates — always generated. */
const COMMANDS = ["dev-next.md", "review.md"] as const;

/**
 * Map task tracker choice to the "get next task" command.
 */
function getTrackerNextCommand(tracker: string): string {
  switch (tracker) {
    case "taskmaster":
      return "task-master next";
    case "beads":
      return "bd show";
    case "markdown":
      return "Read TASKS.md and find the next pending task";
    default:
      return "task-master next";
  }
}

/**
 * Map task tracker choice to the "mark task done" command.
 */
function getTrackerDoneCommand(tracker: string): string {
  switch (tracker) {
    case "taskmaster":
      return "task-master set-status --id=<id> --status=done";
    case "beads":
      return "bd update <id> --status done && bd sync";
    case "markdown":
      return "Edit TASKS.md and mark task as [x]";
    default:
      return "task-master set-status --id=<id> --status=done";
  }
}

/**
 * Generate .claude/commands/ files from templates.
 *
 * Reads command templates from templates/commands/, applies placeholder
 * substitution with tracker-specific commands, and returns FileDescriptor[]
 * for all output files.
 *
 * Implements F8 (Custom Claude Commands) from the PRD.
 * Boot-prompt.txt was removed in F12 — CLAUDE.md provides session context.
 */
export async function generateCommands(config: ProjectConfig): Promise<FileDescriptor[]> {
  const vars: Record<string, string> = {
    PROJECT_NAME: config.projectName,
    TASK_TRACKER: config.taskTracker,
    TASK_TRACKER_NEXT: getTrackerNextCommand(config.taskTracker),
    TASK_TRACKER_DONE: getTrackerDoneCommand(config.taskTracker),
  };

  const files: FileDescriptor[] = [];

  for (const name of COMMANDS) {
    const content = await readCommand(name);
    files.push({
      path: `.claude/commands/${name}`,
      content: fillTemplate(content, vars),
    });
  }

  return files;
}
