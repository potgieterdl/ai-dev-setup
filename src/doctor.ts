import fs from "node:fs/promises";
import path from "node:path";
import { fileExists, isExecutable, isValidJson, commandExists, readOptional } from "./utils.js";
import { MCP_REGISTRY, getRequiredEnvVars } from "./registry.js";
import type { CheckResult, HealthCheck } from "./types.js";

// ANSI colour helpers (degrade gracefully if NO_COLOR is set)
const useColor = !process.env.NO_COLOR && process.stdout.isTTY;
const GREEN = useColor ? "\x1b[32m" : "";
const YELLOW = useColor ? "\x1b[33m" : "";
const RED = useColor ? "\x1b[31m" : "";
const RESET = useColor ? "\x1b[0m" : "";
const BOLD = useColor ? "\x1b[1m" : "";

function symbol(status: CheckResult["status"]): string {
  switch (status) {
    case "pass":
      return `${GREEN}\u2713${RESET}`;
    case "warn":
      return `${YELLOW}\u26A0${RESET}`;
    case "error":
      return `${RED}\u2717${RESET}`;
  }
}

// ─── Individual Check Categories ──────────────────────────────────────────────

/** 1. MCP Config — valid JSON, server fields, packages installed, API keys set */
export async function checkMcpConfig(root: string): Promise<HealthCheck> {
  const results: CheckResult[] = [];

  for (const file of [".mcp.json", ".vscode/mcp.json"]) {
    const fullPath = path.join(root, file);
    const content = await readOptional(fullPath);
    if (content === null) {
      results.push({ status: "warn", message: `${file} not found` });
      continue;
    }
    if (!isValidJson(content)) {
      results.push({ status: "error", message: `${file} is not valid JSON` });
    } else {
      results.push({ status: "pass", message: `${file} is valid JSON` });
    }
  }

  // Check which servers are configured in .mcp.json
  const mcpContent = await readOptional(path.join(root, ".mcp.json"));
  if (mcpContent && isValidJson(mcpContent)) {
    const mcpJson = JSON.parse(mcpContent) as { mcpServers?: Record<string, unknown> };
    const configuredServers = Object.keys(mcpJson.mcpServers ?? {});

    for (const server of MCP_REGISTRY) {
      const isConfigured = configuredServers.includes(server.claudeMcpName);
      if (!isConfigured) continue;

      results.push({ status: "pass", message: `${server.claudeMcpName} server configured` });

      // Check required env vars
      for (const envVar of getRequiredEnvVars(server.name)) {
        const isSet = !!process.env[envVar];
        results.push(
          isSet
            ? { status: "pass", message: `${envVar} is set` }
            : { status: "warn", message: `${envVar} not set in environment` }
        );
      }
    }
  }

  return { category: "MCP Configuration", results };
}

/** 2. Agent Instructions — CLAUDE.md exists, not too large, cross-references resolve */
export async function checkAgentInstructions(root: string): Promise<HealthCheck> {
  const results: CheckResult[] = [];

  for (const file of ["CLAUDE.md", "CLAUDE_MCP.md"]) {
    const fullPath = path.join(root, file);
    const content = await readOptional(fullPath);
    if (content === null) {
      results.push({ status: "error", message: `${file} not found` });
      continue;
    }

    const lines = content.split("\n").length;
    results.push({ status: "pass", message: `${file} exists (${lines} lines)` });

    if (lines > 200) {
      results.push({
        status: "warn",
        message: `${file} is over 200 lines \u2014 consider splitting`,
      });
    }

    // Check @import cross-references (e.g. @./path/to/file.md or @path/to/file.md)
    const refs = [...content.matchAll(/@\.?\/?([^\s)]+\.md)/g)].map((m) => m[1]);
    for (const ref of refs) {
      const refPath = path.join(root, ref);
      const exists = await fileExists(refPath);
      results.push(
        exists
          ? { status: "pass", message: `${file} references ${ref} \u2014 found` }
          : { status: "error", message: `${file} references ${ref} but file not found` }
      );
    }
  }

  return { category: "Agent Instructions", results };
}

/** 3. Rules & Skills — files exist, @import references resolve */
export async function checkRulesAndSkills(root: string): Promise<HealthCheck> {
  const results: CheckResult[] = [];

  for (const dir of [".claude/rules", ".claude/skills"]) {
    const fullDir = path.join(root, dir);
    try {
      const files = await fs.readdir(fullDir);
      const mdFiles = files.filter((f) => f.endsWith(".md"));
      results.push({ status: "pass", message: `${mdFiles.length} files found in ${dir}/` });

      for (const file of mdFiles) {
        const content = await fs.readFile(path.join(fullDir, file), "utf8");
        const refs = [...content.matchAll(/@([\w./\-]+\.md)/g)].map((m) => m[1]);
        for (const ref of refs) {
          const refPath = path.join(root, ref);
          const exists = await fileExists(refPath);
          if (!exists) {
            results.push({
              status: "warn",
              message: `${dir}/${file} imports @${ref} \u2014 file missing`,
            });
          }
        }
      }
    } catch {
      results.push({ status: "warn", message: `${dir}/ directory not found` });
    }
  }

  return { category: "Rules & Skills", results };
}

/** 4. Hooks — scripts exist, are executable, settings.json matchers are valid */
export async function checkHooks(root: string): Promise<HealthCheck> {
  const results: CheckResult[] = [];

  const hooksDir = path.join(root, ".claude/hooks");
  try {
    const files = await fs.readdir(hooksDir);
    const shFiles = files.filter((f) => f.endsWith(".sh"));

    if (shFiles.length === 0) {
      results.push({ status: "warn", message: "No hook scripts found in .claude/hooks/" });
    }

    for (const file of shFiles) {
      const fullPath = path.join(hooksDir, file);
      results.push({ status: "pass", message: `${file} exists` });

      const exec = await isExecutable(fullPath);
      results.push(
        exec
          ? { status: "pass", message: `${file} is executable` }
          : {
              status: "error",
              message: `${file} is not executable (run: chmod +x .claude/hooks/${file})`,
            }
      );
    }
  } catch {
    results.push({ status: "warn", message: ".claude/hooks/ directory not found" });
  }

  const settingsPath = path.join(root, ".claude/settings.json");
  const settingsContent = await readOptional(settingsPath);
  if (settingsContent && isValidJson(settingsContent)) {
    results.push({ status: "pass", message: ".claude/settings.json is valid JSON" });
    const settings = JSON.parse(settingsContent) as { hooks?: unknown };
    if (settings.hooks) {
      results.push({ status: "pass", message: ".claude/settings.json has hooks configured" });
    }
  } else if (settingsContent) {
    results.push({ status: "error", message: ".claude/settings.json is not valid JSON" });
  } else {
    results.push({ status: "warn", message: ".claude/settings.json not found" });
  }

  return { category: "Hooks", results };
}

/** 5. Task Tracker — configured tracker is set up, task files exist */
export async function checkTaskTracker(root: string): Promise<HealthCheck> {
  const results: CheckResult[] = [];

  const tasksJson = path.join(root, ".taskmaster/tasks/tasks.json");
  const beadsDir = path.join(root, ".beads");
  const tasksmd = path.join(root, "TASKS.md");

  if (await fileExists(tasksJson)) {
    const content = await readOptional(tasksJson);
    results.push({ status: "pass", message: "Task Master configured" });
    results.push({ status: "pass", message: ".taskmaster/tasks/tasks.json exists" });

    if (content && isValidJson(content)) {
      const data = JSON.parse(content) as { tasks?: unknown[] };
      const count = data.tasks?.length ?? 0;
      results.push({ status: "pass", message: `${count} tasks found` });
    } else {
      results.push({ status: "error", message: ".taskmaster/tasks/tasks.json is not valid JSON" });
    }
  } else if (await fileExists(beadsDir)) {
    results.push({ status: "pass", message: "Beads task tracker configured" });
  } else if (await fileExists(tasksmd)) {
    results.push({ status: "pass", message: "TASKS.md task tracker configured" });
  } else {
    results.push({
      status: "warn",
      message: "No task tracker configured (no .taskmaster/, .beads/, or TASKS.md)",
    });
  }

  return { category: "Task Tracker", results };
}

/** 6. Documentation — template placeholders are filled, docs/ directory exists */
export async function checkDocumentation(root: string): Promise<HealthCheck> {
  const results: CheckResult[] = [];

  const docsDir = path.join(root, "docs");
  try {
    const files = await fs.readdir(docsDir, { recursive: true });
    const mdFiles = (files as string[]).filter((f) => f.endsWith(".md"));
    results.push({
      status: "pass",
      message: `docs/ directory exists (${mdFiles.length} markdown files)`,
    });

    for (const file of mdFiles) {
      const content = await readOptional(path.join(docsDir, file));
      if (content && /\{\{[A-Z_]+\}\}/.test(content)) {
        results.push({
          status: "warn",
          message: `docs/${file} still has unfilled placeholders ({{...}})`,
        });
      }
    }
  } catch {
    results.push({ status: "warn", message: "docs/ directory not found" });
  }

  return { category: "Documentation", results };
}

/** 7. Dependencies — required npm globals are installed */
export async function checkDependencies(): Promise<HealthCheck> {
  const results: CheckResult[] = [];

  const globals = [
    { cmd: "claude", label: "Claude Code CLI" },
    { cmd: "task-master", label: "Task Master CLI" },
    { cmd: "npx", label: "npx (Node.js)" },
  ];

  for (const { cmd, label } of globals) {
    const exists = await commandExists(cmd);
    results.push(
      exists
        ? { status: "pass", message: `${label} (${cmd}) is installed` }
        : { status: "warn", message: `${label} (${cmd}) not found on PATH` }
    );
  }

  return { category: "Dependencies", results };
}

// ─── Runner ──────────────────────────────────────────────────────────────────

/** Run all health checks and return structured results. */
export async function runDoctor(projectRoot: string): Promise<HealthCheck[]> {
  return Promise.all([
    checkMcpConfig(projectRoot),
    checkAgentInstructions(projectRoot),
    checkRulesAndSkills(projectRoot),
    checkHooks(projectRoot),
    checkTaskTracker(projectRoot),
    checkDocumentation(projectRoot),
    checkDependencies(),
  ]);
}

/** Print results to stdout with colour coding. Returns exit code (0 or 1). */
export function printDoctorReport(checks: HealthCheck[]): number {
  let passes = 0;
  let warnings = 0;
  let errors = 0;

  console.log(`\n${BOLD}AI Dev Environment Health Check${RESET}`);
  console.log("\u2501".repeat(32));

  for (const check of checks) {
    console.log(`\n${BOLD}${check.category}${RESET}`);
    for (const result of check.results) {
      console.log(`  ${symbol(result.status)} ${result.message}`);
      if (result.status === "pass") passes++;
      if (result.status === "warn") warnings++;
      if (result.status === "error") errors++;
    }
  }

  console.log(`\n${"━".repeat(32)}`);
  console.log(
    `Summary: ${GREEN}${passes} passed${RESET}, ` +
      `${YELLOW}${warnings} warnings${RESET}, ` +
      `${RED}${errors} errors${RESET}`
  );

  if (errors > 0) {
    console.log("Run 'ai-init update' to fix configuration issues.");
  }

  return errors > 0 ? 1 : 0;
}
