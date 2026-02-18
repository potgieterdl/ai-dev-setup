import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectConfig, FileDescriptor } from "../types.js";
import { fillTemplate } from "../utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/skills");

/**
 * Read a skill template file from the templates/skills/ directory.
 */
async function readSkill(name: string): Promise<string> {
  return fs.readFile(path.join(TEMPLATES_DIR, name), "utf8");
}

/** All skill templates — always generated. */
const SKILLS = ["testing.md", "commit.md", "task-workflow.md"] as const;

/**
 * Generate .claude/skills/ files from templates.
 *
 * Reads skill templates from templates/skills/, applies placeholder substitution,
 * and returns FileDescriptor[] for all skills.
 *
 * All three skills are always generated. task-workflow.md gets TASK_TRACKER
 * substituted so the workflow instructions match the chosen tracker.
 *
 * Implements F3 (Skills generation) from the PRD.
 */
export async function generateSkills(config: ProjectConfig): Promise<FileDescriptor[]> {
  const vars: Record<string, string> = {
    PROJECT_NAME: config.projectName,
    TASK_TRACKER: config.taskTracker,
    PM_NAME: config.pm.name,
    PM_RUN: config.pm.run,
    PM_INSTALL: config.pm.install,
    PM_EXEC: config.pm.exec,
    PM_TEST: config.pm.test,
    PM_RUN_IF_PRESENT: config.pm.runIfPresent,
    PM_INSTALL_GLOBAL: config.pm.installGlobal,
  };

  const selected = new Set(config.selectedSkills);
  const files: FileDescriptor[] = [];

  for (const name of SKILLS) {
    const slug = name.replace(".md", "");
    if (!selected.has(slug)) continue;
    const content = await readSkill(name);
    files.push({
      path: `.claude/skills/${name}`,
      content: fillTemplate(content, vars),
    });
  }

  return files;
}
