#!/usr/bin/env node

import { runOnCreate, runPostCreate, runPostStart } from "./phases/index.js";
import { runWizard } from "./wizard.js";

const VERSION = "0.1.0";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "--version" || command === "-v") {
    console.log(`ai-init v${VERSION}`);
    return;
  }

  if (command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const projectRoot = process.cwd();

  switch (command) {
    case "on-create":
      await runOnCreate();
      break;

    case "post-create": {
      // When run as a lifecycle phase, use wizard in non-interactive mode
      // or with defaults if env vars aren't set
      const config = await runWizard(projectRoot);
      await runPostCreate(config);
      break;
    }

    case "post-start": {
      const config = await runWizard(projectRoot);
      await runPostStart(config);
      break;
    }

    case "--non-interactive": {
      // Explicit non-interactive flag — set env var and run full flow
      process.env.SETUP_AI_NONINTERACTIVE = "1";
      const config = await runWizard(projectRoot);
      await runPostCreate(config);
      break;
    }

    default: {
      // Default: interactive wizard (F6)
      const config = await runWizard(projectRoot);
      await runPostCreate(config);
      break;
    }
  }
}

function printHelp(): void {
  console.log(`ai-init v${VERSION}

Usage:
  ai-init                    Interactive wizard
  ai-init on-create          Codespace lifecycle: install global tools
  ai-init post-create        Codespace lifecycle: generate project files
  ai-init post-start         Codespace lifecycle: per-session setup
  ai-init --non-interactive  Env-var driven, no prompts

Environment variables (for --non-interactive or SETUP_AI_NONINTERACTIVE=1):
  SETUP_AI_MCPS              Comma-separated MCP server names (e.g. taskmaster,context7)
  SETUP_AI_TRACKER           Task tracker: taskmaster | beads | markdown
  SETUP_AI_ARCH              Architecture: monolith | 2-tier | 3-tier | microservices | skip
  SETUP_AI_AGENT_TEAMS       Set to 1 to enable agent teams
  SETUP_AI_SKIP_AUDIT        Set to 1 to skip AI audit
  SETUP_AI_PRD_PATH          Path to existing PRD file

Options:
  -h, --help       Show this help message
  -v, --version    Show version number`);
}

main().catch((err: unknown) => {
  console.error("[ai-init] Fatal error:", err);
  process.exit(1);
});
