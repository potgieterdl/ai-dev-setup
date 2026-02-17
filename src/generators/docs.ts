import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectConfig, FileDescriptor } from "../types.js";
import { fillTemplate } from "../utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/docs");

/**
 * Read a template file from the templates/docs/ directory.
 */
async function readTemplate(name: string): Promise<string> {
  return fs.readFile(path.join(TEMPLATES_DIR, name), "utf8");
}

/** Core doc templates that are always generated. */
const CORE_DOCS = [
  { template: "doc_format.md", output: "docs/doc_format.md" },
  { template: "prd.md", output: "docs/prd.md" },
  { template: "architecture.md", output: "docs/architecture.md" },
  { template: "cuj.md", output: "docs/cuj.md" },
  { template: "testing_strategy.md", output: "docs/testing_strategy.md" },
  { template: "onboarding.md", output: "docs/onboarding.md" },
] as const;

/**
 * Generate project documentation files from templates.
 *
 * Reads templates from templates/docs/, applies placeholder substitution
 * via fillTemplate(), and returns FileDescriptor[] for all docs.
 *
 * Async because it reads template files from disk.
 * Implements F2 (Document Scaffolding) from the PRD.
 */
export async function generateDocs(config: ProjectConfig): Promise<FileDescriptor[]> {
  const vars: Record<string, string> = {
    PROJECT_NAME: config.projectName,
    ARCHITECTURE: config.architecture,
    DATE: new Date().toISOString().split("T")[0],
    TASK_TRACKER: config.taskTracker,
  };

  const files: FileDescriptor[] = [];

  // Core docs — always generated
  for (const { template, output } of CORE_DOCS) {
    const content = await readTemplate(template);
    files.push({ path: output, content: fillTemplate(content, vars) });
  }

  // API docs — only if hasApiDocs
  if (config.hasApiDocs) {
    const content = await readTemplate("api.md");
    files.push({ path: "docs/api.md", content: fillTemplate(content, vars) });
  }

  // ADR template — always included
  const adrContent = await readTemplate("adr_template.md");
  files.push({
    path: "docs/adr/adr_template.md",
    content: fillTemplate(adrContent, { ...vars, NUMBER: "NNN", TITLE: "Decision Title" }),
  });

  // Simple markdown task file — only for markdown tracker
  if (config.taskTracker === "markdown") {
    const content = await readTemplate("tasks_simple.md");
    files.push({ path: "TASKS.md", content: fillTemplate(content, vars) });
  }

  return files;
}
