#!/usr/bin/env node

import meow from "meow";
import { runOnCreate, runPostCreate, runPostStart } from "./phases/index.js";
import { runWizard } from "./wizard.js";
import { runUpdate } from "./update.js";
import { runDoctor, printDoctorReport } from "./doctor.js";
import { runAudit, checkClaudeCodeAvailable, installClaudeCode } from "./audit.js";
import { defaultConfig } from "./defaults.js";
import { isValidPmName } from "./pm.js";
import { writeSavedConfig } from "./utils.js";
import type { ProjectConfig, SavedConfig } from "./types.js";

const cli = meow(
  `
  Usage
    $ ai-init [command] [options]

  Commands
    (none)          Interactive setup wizard
    on-create       Heavy installs — run once during Codespace creation
    post-create     Project scaffolding — run after Codespace creation
    post-start      Per-session setup — run on every container start
    update          Incrementally reconfigure after initial setup
    doctor          Validate the AI dev environment setup

  Options
    --non-interactive   Skip prompts, use environment variables
    --no-audit          Skip the Claude Code audit step
    --overwrite         Overwrite existing files (default: true)
    --pm <name>         Force package manager: npm | pnpm | yarn | bun
    --version           Show version
    --help              Show help

  Update Options (for 'ai-init update')
    --add-mcp=<name>      Add an MCP server
    --remove-mcp=<name>   Remove an MCP server
    --tracker=<name>      Switch task tracker (taskmaster|beads|markdown)
    --add-rule=<name>     Add a rule category
    --remove-rule=<name>  Remove a rule category
    --enable-teams        Enable agent teams
    --disable-teams       Disable agent teams

  Environment Variables
    SETUP_AI_NONINTERACTIVE=1   Same as --non-interactive
    SETUP_AI_MCPS               Comma-separated MCP names
    SETUP_AI_TRACKER            taskmaster | beads | markdown
    SETUP_AI_ARCH               monolith | 2-tier | 3-tier | microservices | skip
    SETUP_AI_SKIP_AUDIT=1       Skip audit step
    SETUP_AI_AGENT_TEAMS=1      Enable agent teams
    SETUP_AI_PM                 npm | pnpm | yarn | bun
    SETUP_AI_PRD_PATH           Path to existing PRD file
`,
  {
    importMeta: import.meta,
    flags: {
      nonInteractive: { type: "boolean", default: false },
      audit: { type: "boolean", default: true },
      overwrite: { type: "boolean", default: true },
      pm: { type: "string" },
      // Update subcommand flags (F16)
      addMcp: { type: "string" },
      removeMcp: { type: "string" },
      tracker: { type: "string" },
      addRule: { type: "string" },
      removeRule: { type: "string" },
      enableTeams: { type: "boolean", default: false },
      disableTeams: { type: "boolean", default: false },
    },
  }
);

/**
 * Build a SavedConfig from a ProjectConfig for persistence to .ai-init.json (F16).
 */
function toSavedConfig(config: ProjectConfig): SavedConfig {
  return {
    version: "0.1.0",
    selectedMcps: config.selectedMcps,
    taskTracker: config.taskTracker,
    architecture: config.architecture,
    selectedRules: config.selectedRules,
    selectedHookSteps: config.selectedHookSteps,
    selectedSkills: config.selectedSkills,
    pm: config.pm.name,
    agentTeamsEnabled: config.agentTeamsEnabled,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * If --pm flag is set, propagate it via SETUP_AI_PM so the wizard picks it up.
 */
function applyPmOverride(): void {
  if (cli.flags.pm && isValidPmName(cli.flags.pm)) {
    process.env.SETUP_AI_PM = cli.flags.pm;
  }
}

async function main(): Promise<void> {
  const [command] = cli.input;
  const projectRoot = process.cwd();

  // --non-interactive flag sets the env var so wizard reads it
  if (cli.flags.nonInteractive || process.env.SETUP_AI_NONINTERACTIVE === "1") {
    process.env.SETUP_AI_NONINTERACTIVE = "1";
  }

  // Validate --pm flag if provided
  if (cli.flags.pm !== undefined) {
    if (!isValidPmName(cli.flags.pm)) {
      console.error(`[ai-init] Invalid --pm value: "${cli.flags.pm}". Valid: npm, pnpm, yarn, bun`);
      process.exit(1);
    }
  }

  switch (command) {
    case "on-create":
      await runOnCreate();
      break;

    case "post-create": {
      // Lifecycle mode: force non-interactive, run wizard + generators
      process.env.SETUP_AI_NONINTERACTIVE = "1";
      applyPmOverride();
      const config = await runWizard(projectRoot);
      if (!cli.flags.audit) {
        config.runAudit = false;
      }
      const written = await runPostCreate(config, cli.flags.overwrite);
      printGeneratedFiles(written);
      // Persist wizard choices for incremental updates (F16)
      await writeSavedConfig(projectRoot, toSavedConfig(config));
      if (config.runAudit) {
        await runAudit(config, config.generatedFiles);
      }
      break;
    }

    case "post-start": {
      // Lightweight per-session setup — use defaults, no full wizard needed
      const config = defaultConfig(projectRoot);
      await runPostStart(config);
      break;
    }

    case "update": {
      // Incremental re-configuration (F16)
      await runUpdate(projectRoot, cli.flags);
      break;
    }

    case "doctor": {
      // Health check & validation (F17)
      const checks = await runDoctor(projectRoot);
      const exitCode = printDoctorReport(checks);
      process.exit(exitCode);
      break;
    }

    default: {
      // Default: interactive wizard flow (F6)

      // Step 0: Ensure Claude Code is installed for audit capability
      if (!(await checkClaudeCodeAvailable())) {
        await installClaudeCode().catch(() => {
          console.warn("[ai-init] Could not install Claude Code — audit will be skipped.");
        });
      }

      applyPmOverride();
      const config = await runWizard(projectRoot);

      // Apply CLI flags
      if (!cli.flags.audit) {
        config.runAudit = false;
      }

      const written = await runPostCreate(config, cli.flags.overwrite);
      printGeneratedFiles(written);

      // Persist wizard choices for incremental updates (F16)
      await writeSavedConfig(projectRoot, toSavedConfig(config));

      if (config.runAudit) {
        await runAudit(config, config.generatedFiles);
      }

      printNextSteps(config.taskTracker);
    }
  }
}

function printGeneratedFiles(files: string[]): void {
  console.log(`\n[ai-init] Generated ${files.length} files:`);
  for (const f of files) {
    console.log(`  \u2713 ${f}`);
  }
}

function printNextSteps(tracker: string): void {
  console.log(
    "\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501"
  );
  console.log("  Setup complete! Next steps:");
  console.log("  1. Fill in docs/prd.md with your project requirements");
  console.log("  2. Review docs/architecture.md and add specifics");
  console.log("  3. Open Claude Code and run /dev-next to start building");
  if (tracker === "taskmaster") {
    console.log("  4. Parse your PRD: task-master parse-prd docs/prd.md");
  }
  console.log(
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n"
  );
}

main().catch((err: unknown) => {
  console.error("[ai-init] Fatal error:", err);
  process.exit(1);
});
