import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectConfig, FileDescriptor } from "../types.js";
import { fillTemplate } from "../utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/rules");

/**
 * Read a rule template file from the templates/rules/ directory.
 */
async function readRule(name: string): Promise<string> {
  return fs.readFile(path.join(TEMPLATES_DIR, name), "utf8");
}

/** Rules that are always generated regardless of config. */
const ALWAYS_RULES = [
  "general.md",
  "docs.md",
  "testing.md",
  "git.md",
  "security.md",
  "config.md",
] as const;

/**
 * Generate .claude/rules/ files from templates.
 *
 * Reads rule templates from templates/rules/, applies placeholder substitution,
 * and returns FileDescriptor[] for the rules appropriate to this project config.
 *
 * Rules are conditionally included based on config flags:
 * - api.md: only if hasApiDocs is true (with @docs/api.md import if docs are generated)
 * - database.md: only if hasDatabase is true
 * - agent-teams.md: only if agentTeamsEnabled is true
 *
 * Implements F3 (Rules generation) from the PRD.
 */
export async function generateRules(config: ProjectConfig): Promise<FileDescriptor[]> {
  // Use AI-detected paths or fall back to hardcoded defaults (F20)
  const apiPaths = config.analysisResult?.apiPaths ?? ["src/api/**", "src/routes/**"];
  const dbPaths = config.analysisResult?.dbPaths ?? [
    "src/db/**",
    "src/models/**",
    "**/migrations/**",
  ];

  const { toolchain: tc } = config;
  const languageLabel =
    tc.language === "node"
      ? "TypeScript"
      : tc.language === "python"
        ? "Python"
        : tc.language === "go"
          ? "Go"
          : tc.language === "rust"
            ? "Rust"
            : "TypeScript";

  const vars: Record<string, string> = {
    PROJECT_NAME: config.projectName,
    TASK_TRACKER: config.taskTracker,
    LANGUAGE: languageLabel,
    PM_NAME: config.pm.name,
    PM_RUN: config.pm.run,
    PM_INSTALL: config.pm.install,
    PM_EXEC: config.pm.exec,
    PM_TEST: config.pm.test,
    PM_RUN_IF_PRESENT: config.pm.runIfPresent,
    PM_INSTALL_GLOBAL: config.pm.installGlobal,
    API_PATHS: apiPaths.map((p) => `"${p}"`).join("\n  - "),
    DB_PATHS: dbPaths.map((p) => `"${p}"`).join("\n  - "),
    FORMAT_CMD: tc.format,
    LINT_CMD: tc.lint,
    TYPECHECK_CMD: tc.typecheck,
    BUILD_CMD: tc.build,
    TEST_CMD: tc.test,
  };

  const selected = new Set(config.selectedRules);
  const files: FileDescriptor[] = [];

  // Always-generated rules (filtered by selectedRules)
  for (const name of ALWAYS_RULES) {
    const slug = name.replace(".md", "");
    if (!selected.has(slug)) continue;
    const content = await readRule(name);
    files.push({
      path: `.claude/rules/${name}`,
      content: fillTemplate(content, vars),
    });
  }

  // Conditional — API rules only if API docs selected AND in selectedRules
  if (config.hasApiDocs && selected.has("api")) {
    let content = await readRule("api.md");
    if (config.generateDocs) {
      content += "\n\n@docs/api.md";
    }
    files.push({
      path: ".claude/rules/api.md",
      content: fillTemplate(content, vars),
    });
  }

  // Conditional — database rules only if project has DB AND in selectedRules
  if (config.hasDatabase && selected.has("database")) {
    const content = await readRule("database.md");
    files.push({
      path: ".claude/rules/database.md",
      content: fillTemplate(content, vars),
    });
  }

  // Conditional — agent teams rule only if opted in (not part of selectedRules picker)
  if (config.agentTeamsEnabled) {
    const content = await readRule("agent-teams.md");
    files.push({
      path: ".claude/rules/agent-teams.md",
      content: fillTemplate(content, vars),
    });
  }

  return files;
}
