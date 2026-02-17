#!/usr/bin/env node

import { runOnCreate, runPostCreate, runPostStart } from "./phases/index.js";
import { defaultConfig } from "./defaults.js";

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
  const config = defaultConfig(projectRoot);

  switch (command) {
    case "on-create":
      await runOnCreate();
      break;

    case "post-create":
      await runPostCreate(config);
      break;

    case "post-start":
      await runPostStart(config);
      break;

    default:
      // Default: interactive wizard (future — F6)
      // For now, print version and usage
      console.log(`ai-init v${VERSION}`);
      console.log("Run 'ai-init --help' for usage information.");
      break;
  }
}

function printHelp(): void {
  console.log(`ai-init v${VERSION}

Usage:
  ai-init                    Interactive wizard (coming soon)
  ai-init on-create          Codespace lifecycle: install global tools
  ai-init post-create        Codespace lifecycle: generate project files
  ai-init post-start         Codespace lifecycle: per-session setup
  ai-init --non-interactive  Env-var driven, no prompts (coming soon)

Options:
  -h, --help       Show this help message
  -v, --version    Show version number`);
}

main().catch((err: unknown) => {
  console.error("[ai-init] Fatal error:", err);
  process.exit(1);
});
