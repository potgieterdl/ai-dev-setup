import { select, checkbox, confirm, input } from "@inquirer/prompts";
import type { ProjectConfig, TaskTracker, Architecture } from "./types.js";
import { MCP_REGISTRY } from "./registry.js";
import { defaultConfig } from "./defaults.js";
import { commandExists } from "./utils.js";
import { detectPackageManager, PACKAGE_MANAGERS, isValidPmName } from "./pm.js";

/**
 * Check if the wizard is running in non-interactive mode.
 * Reads SETUP_AI_NONINTERACTIVE env var.
 */
function isNonInteractive(): boolean {
  return process.env.SETUP_AI_NONINTERACTIVE === "1";
}

/**
 * Read an environment variable, returning the fallback if not set.
 */
function fromEnv<T extends string>(key: string, fallback: T): T {
  const val = process.env[key];
  return val !== undefined ? (val as T) : fallback;
}

/**
 * Step 0: Claude Code Bootstrap
 * Checks if Claude Code is installed and available.
 * Returns true if Claude Code is ready for audit use.
 */
async function stepClaudeBootstrap(): Promise<boolean> {
  console.log("\n  Step 0: Checking Claude Code availability...");
  const hasClaude = await commandExists("claude");
  if (hasClaude) {
    console.log("  ✓ Claude Code is installed.");
    return true;
  }
  console.log("  ⚠ Claude Code not found. Audit step (Step 9) will be skipped.");
  return false;
}

/**
 * Package Manager Detection (F15)
 * Auto-detects the project's package manager from lock files and package.json.
 * Override priority: --pm CLI flag > SETUP_AI_PM env var > lock file detection > npm fallback.
 */
async function stepPackageManager(config: ProjectConfig): Promise<void> {
  // Check for explicit override via --pm flag or SETUP_AI_PM env var
  const envPm = process.env.SETUP_AI_PM;
  if (envPm && isValidPmName(envPm)) {
    config.pm = PACKAGE_MANAGERS[envPm];
    if (!isNonInteractive()) {
      console.log(`  Package manager: ${config.pm.name} (from --pm flag)`);
    }
    return;
  }

  // Auto-detect from project root
  const detected = await detectPackageManager(config.projectRoot);
  config.pm = detected;
  if (!isNonInteractive()) {
    console.log(`  Package manager: ${detected.name} (auto-detected)`);
  }
}

/**
 * Step 1: MCP Server Selection
 * In non-interactive mode, reads SETUP_AI_MCPS env var (comma-separated).
 */
async function stepMcpSelection(config: ProjectConfig): Promise<void> {
  if (isNonInteractive()) {
    const envMcps = process.env.SETUP_AI_MCPS;
    config.selectedMcps = envMcps ? envMcps.split(",").map((s) => s.trim()) : ["taskmaster"];
    return;
  }

  const choices = MCP_REGISTRY.map((s) => ({
    name: `${s.name} — ${s.description}`,
    value: s.name,
    checked: s.name === "taskmaster",
  }));

  config.selectedMcps = await checkbox({
    message: "Step 1: Select MCP servers to configure:",
    choices,
  });
}

/**
 * Step 2: Task Tracker Choice
 * In non-interactive mode, reads SETUP_AI_TRACKER env var.
 */
async function stepTaskTracker(config: ProjectConfig): Promise<void> {
  if (isNonInteractive()) {
    config.taskTracker = fromEnv<TaskTracker>("SETUP_AI_TRACKER", "taskmaster");
    return;
  }

  config.taskTracker = (await select({
    message: "Step 2: Choose a task tracker:",
    choices: [
      {
        name: "Task Master (recommended — subtasks, research, complexity analysis)",
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
    default: "taskmaster",
  })) as TaskTracker;

  // Ensure taskmaster MCP is included if taskmaster tracker is selected
  if (config.taskTracker === "taskmaster" && !config.selectedMcps.includes("taskmaster")) {
    config.selectedMcps.push("taskmaster");
  }
  // Ensure beads MCP is included if beads tracker is selected
  if (config.taskTracker === "beads" && !config.selectedMcps.includes("beads")) {
    config.selectedMcps.push("beads");
  }
}

/**
 * Step 3: PRD
 * Asks if the user has a PRD to import or wants to use the template.
 * In non-interactive mode, reads SETUP_AI_PRD_PATH env var.
 */
async function stepPrd(config: ProjectConfig): Promise<void> {
  if (isNonInteractive()) {
    const prdPath = process.env.SETUP_AI_PRD_PATH;
    if (prdPath) {
      config.prdPath = prdPath;
      config.hasPrd = true;
    }
    return;
  }

  const hasPrd = await confirm({
    message: "Step 3: Do you have an existing PRD to import?",
    default: false,
  });

  if (hasPrd) {
    const prdPath = await input({
      message: "  Path to PRD file:",
      default: "docs/prd.md",
    });
    config.prdPath = prdPath;
    config.hasPrd = true;
  } else {
    console.log("  → A PRD template will be generated in docs/prd.md for you to fill in.");
  }
}

/**
 * Step 4: Architecture
 * In non-interactive mode, reads SETUP_AI_ARCH env var.
 */
async function stepArchitecture(config: ProjectConfig): Promise<void> {
  if (isNonInteractive()) {
    config.architecture = fromEnv<Architecture>("SETUP_AI_ARCH", "skip");
    return;
  }

  config.architecture = (await select({
    message: "Step 4: Project architecture (populates docs/architecture.md):",
    choices: [
      { name: "Skip", value: "skip" },
      { name: "Monolith", value: "monolith" },
      { name: "2-tier (frontend + backend)", value: "2-tier" },
      { name: "3-tier (frontend + API + database)", value: "3-tier" },
      { name: "Microservices", value: "microservices" },
    ],
  })) as Architecture;
}

/**
 * Step 5: API Surface
 * Asks whether to generate API docs template.
 */
async function stepApiDocs(config: ProjectConfig): Promise<void> {
  if (isNonInteractive()) {
    // Default: generate API docs unless architecture is skip or monolith
    config.hasApiDocs = config.architecture !== "skip" && config.architecture !== "monolith";
    return;
  }

  config.hasApiDocs = await confirm({
    message: "Step 5: Generate API docs template?",
    default: config.architecture !== "skip" && config.architecture !== "monolith",
  });
}

/**
 * Step 6: Database
 * Asks whether the project uses a database (drives rules generation).
 */
async function stepDatabase(config: ProjectConfig): Promise<void> {
  if (isNonInteractive()) {
    config.hasDatabase = config.architecture === "3-tier";
    return;
  }

  config.hasDatabase = await confirm({
    message: "Step 6: Does this project use a database?",
    default: config.architecture === "3-tier",
  });
}

/**
 * Step 6b: Rules Picker (F13)
 * Multi-select to choose which rules to generate.
 * In non-interactive mode, reads SETUP_AI_RULES env var (comma-separated).
 */
async function stepRulesPicker(config: ProjectConfig): Promise<void> {
  if (isNonInteractive()) {
    const envVal = process.env.SETUP_AI_RULES;
    if (envVal) {
      config.selectedRules = envVal
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return;
  }

  if (!config.generateRules) return;

  const choices = [
    { name: "general   — Language & coding style", value: "general", checked: true },
    { name: "docs      — Documentation standards", value: "docs", checked: true },
    { name: "testing   — Test-first & quality gate", value: "testing", checked: true },
    { name: "git       — Commit & branch conventions", value: "git", checked: true },
    { name: "security  — OWASP & secrets hygiene", value: "security", checked: true },
    { name: "config    — Config file conventions", value: "config", checked: true },
    { name: "api       — API documentation rules", value: "api", checked: config.hasApiDocs },
    {
      name: "database  — Database schema & query rules",
      value: "database",
      checked: config.hasDatabase,
    },
  ];

  config.selectedRules = await checkbox({
    message: "Step 6b: Which rules do you want to generate? (space to toggle)",
    choices,
  });
}

/**
 * Step 6c: Hooks Picker (F13)
 * Multi-select to choose which pre-commit quality gate steps to include.
 * In non-interactive mode, reads SETUP_AI_HOOKS env var (comma-separated).
 */
async function stepHooksPicker(config: ProjectConfig): Promise<void> {
  if (isNonInteractive()) {
    const envVal = process.env.SETUP_AI_HOOKS;
    if (envVal) {
      config.selectedHookSteps = envVal
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return;
  }

  if (!config.generateHooks) return;

  const choices = [
    { name: "format    — Run formatter (prettier / black)", value: "format", checked: true },
    { name: "lint      — Run linter (eslint / ruff)", value: "lint", checked: true },
    { name: "typecheck — Run type checker (tsc / mypy)", value: "typecheck", checked: true },
    { name: "build     — Run build command", value: "build", checked: true },
    { name: "test      — Run test suite", value: "test", checked: true },
  ];

  config.selectedHookSteps = await checkbox({
    message: "Step 6c: Which pre-commit quality gate steps should run?",
    choices,
  });
}

/**
 * Step 6d: Skills Picker (F13)
 * Multi-select to choose which skills to generate.
 * In non-interactive mode, reads SETUP_AI_SKILLS env var (comma-separated).
 */
async function stepSkillsPicker(config: ProjectConfig): Promise<void> {
  if (isNonInteractive()) {
    const envVal = process.env.SETUP_AI_SKILLS;
    if (envVal) {
      config.selectedSkills = envVal
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return;
  }

  if (!config.generateSkills) return;

  const choices = [
    { name: "testing       — Testing workflow skill", value: "testing", checked: true },
    { name: "commit        — Commit message conventions skill", value: "commit", checked: true },
    { name: "task-workflow  — Task tracker workflow skill", value: "task-workflow", checked: true },
  ];

  config.selectedSkills = await checkbox({
    message: "Step 6d: Which skills do you want to generate?",
    choices,
  });
}

/**
 * Step 7: Doc & Agent Instruction Generation confirmation
 * Confirms which generation categories to run.
 */
async function stepGeneration(config: ProjectConfig): Promise<void> {
  if (isNonInteractive()) {
    // In non-interactive mode, generate everything by default
    return;
  }

  console.log("\n  Step 7: The following will be generated:");
  console.log("    • docs/           — Document templates (PRD, architecture, API, CUJ, etc.)");
  console.log("    • .claude/rules/  — Path-scoped agent instructions");
  console.log("    • .claude/skills/ — Keyword-activated domain knowledge");
  console.log("    • .claude/hooks/  — Pre-commit quality gate");
  console.log("    • .claude/commands/ — Slash commands (/dev-next, /review)");
  console.log("    • CLAUDE.md       — Top-level agent instructions");
  console.log("    • .mcp.json       — MCP server configuration");

  const generateAll = await confirm({
    message: "Generate all of the above?",
    default: true,
  });

  if (!generateAll) {
    config.generateDocs = await confirm({ message: "  Generate docs/?", default: true });
    config.generateRules = await confirm({ message: "  Generate .claude/rules/?", default: true });
    config.generateSkills = await confirm({
      message: "  Generate .claude/skills/?",
      default: true,
    });
    config.generateHooks = await confirm({ message: "  Generate .claude/hooks/?", default: true });
    config.generateCommands = await confirm({
      message: "  Generate .claude/commands/?",
      default: true,
    });
  }
}

/**
 * Step 8: Agent Teams (opt-in)
 * In non-interactive mode, reads SETUP_AI_AGENT_TEAMS env var.
 */
async function stepAgentTeams(config: ProjectConfig): Promise<void> {
  if (isNonInteractive()) {
    config.agentTeamsEnabled = process.env.SETUP_AI_AGENT_TEAMS === "1";
    return;
  }

  config.agentTeamsEnabled = await confirm({
    message:
      "Step 8 (Optional): Enable Claude Code experimental agent teams mode? (advanced — skip for most projects)",
    default: false,
  });
}

/**
 * Step 9: AI-Powered Audit
 * In non-interactive mode, reads SETUP_AI_SKIP_AUDIT env var.
 */
async function stepAudit(config: ProjectConfig, claudeAvailable: boolean): Promise<void> {
  if (!claudeAvailable) {
    config.runAudit = false;
    console.log("\n  Step 9: Skipping AI audit — Claude Code not available.");
    return;
  }

  if (isNonInteractive()) {
    config.runAudit = process.env.SETUP_AI_SKIP_AUDIT !== "1";
    return;
  }

  config.runAudit = await confirm({
    message: "Step 9: Run AI-powered audit of generated files? (uses API credits)",
    default: true,
  });
}

/**
 * Step 10: Summary & Next Steps
 * Prints a summary of all choices made and what to do next.
 */
function stepSummary(config: ProjectConfig): void {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Setup Summary");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(`  Project:       ${config.projectName}`);
  console.log(`  Package mgr:   ${config.pm.name}`);
  console.log(`  MCP servers:   ${config.selectedMcps.join(", ") || "none"}`);
  console.log(`  Task tracker:  ${config.taskTracker}`);
  console.log(`  Architecture:  ${config.architecture}`);
  console.log(`  API docs:      ${config.hasApiDocs ? "yes" : "no"}`);
  console.log(`  Database:      ${config.hasDatabase ? "yes" : "no"}`);
  console.log(`  Agent teams:   ${config.agentTeamsEnabled ? "enabled" : "disabled"}`);
  console.log(`  AI audit:      ${config.runAudit ? "yes" : "skipped"}`);
  console.log(
    `  Generate:      docs=${config.generateDocs} rules=${config.generateRules} skills=${config.generateSkills} hooks=${config.generateHooks} commands=${config.generateCommands}`
  );

  console.log("\n  Next steps:");
  console.log("  1. Review and fill in docs/prd.md with your project requirements");
  console.log("  2. Review docs/architecture.md and add specifics");
  console.log("  3. Start developing: run /dev-next in Claude Code");
  if (config.taskTracker === "taskmaster") {
    console.log("  4. Parse your PRD: task-master parse-prd docs/prd.md");
  }
  console.log("");
}

/**
 * Run the interactive 10-step setup wizard.
 *
 * Collects user choices into a ProjectConfig that drives all generators.
 * In non-interactive mode (SETUP_AI_NONINTERACTIVE=1), reads all choices
 * from environment variables and returns defaults for any that are unset.
 *
 * Returns a fully-populated ProjectConfig ready for the post-create phase.
 */
export async function runWizard(projectRoot: string): Promise<ProjectConfig> {
  const config = defaultConfig(projectRoot);

  if (!isNonInteractive()) {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  AI Project Init — Setup Wizard");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }

  // Step 0: Claude Code Bootstrap
  const claudeAvailable = await stepClaudeBootstrap();

  // Package Manager Detection (F15) — auto-detect before wizard steps
  await stepPackageManager(config);

  // Step 1: MCP Server Selection
  await stepMcpSelection(config);

  // Step 2: Task Tracker Choice
  await stepTaskTracker(config);

  // Step 3: PRD
  await stepPrd(config);

  // Step 4: Architecture
  await stepArchitecture(config);

  // Step 5: API Surface
  await stepApiDocs(config);

  // Step 6: Database
  await stepDatabase(config);

  // Step 6b: Rules Picker (F13)
  await stepRulesPicker(config);

  // Step 6c: Hooks Picker (F13)
  await stepHooksPicker(config);

  // Step 6d: Skills Picker (F13)
  await stepSkillsPicker(config);

  // Step 7: Generation confirmation
  await stepGeneration(config);

  // Step 8: Agent Teams
  await stepAgentTeams(config);

  // Step 9: AI Audit
  await stepAudit(config, claudeAvailable);

  // Step 10: Summary
  if (!isNonInteractive()) {
    stepSummary(config);
  }

  return config;
}
