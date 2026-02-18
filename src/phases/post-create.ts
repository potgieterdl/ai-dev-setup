import type { ProjectConfig } from "../types.js";
import { writeFiles } from "../utils.js";
import { generateMcpJson } from "../generators/mcp-json.js";
import { generateClaudeMd } from "../generators/claude-md.js";
import { generateDocs } from "../generators/docs.js";
import { generateRules } from "../generators/rules.js";
import { generateSkills } from "../generators/skills.js";
import { generateHooks } from "../generators/hooks.js";
import { generateDevcontainer } from "../generators/devcontainer.js";
import { generateCommands } from "../generators/commands.js";
import { configureAgentTeams } from "../generators/agent-teams.js";
import type { FileDescriptor } from "../types.js";

/**
 * Post-create phase — project configuration, orchestrates all generators.
 *
 * This phase runs as the `postCreateCommand` in devcontainer.json.
 * It collects FileDescriptor[] from every generator, then writes them
 * all to disk in a single pass via writeFiles().
 *
 * Each generator is conditionally invoked based on the ProjectConfig
 * feature flags (generateDocs, generateRules, etc.). Generators that
 * are always required (MCP config, CLAUDE.md, devcontainer) run unconditionally.
 *
 * Returns the list of file paths that were written — this is used
 * by the audit step (F11) to scope its review to only generated files.
 */
export async function runPostCreate(config: ProjectConfig, overwrite = true): Promise<string[]> {
  console.log("[ai-init] Phase: post-create — generating project files...");

  const allFiles: FileDescriptor[] = [];

  // Always-generated files
  allFiles.push(...generateMcpJson(config));
  allFiles.push(...generateClaudeMd(config));
  allFiles.push(...generateDevcontainer(config));

  // Conditionally-generated files
  if (config.generateDocs) {
    allFiles.push(...(await generateDocs(config)));
  }

  if (config.generateRules) {
    allFiles.push(...(await generateRules(config)));
  }

  if (config.generateSkills) {
    allFiles.push(...(await generateSkills(config)));
  }

  if (config.generateHooks) {
    allFiles.push(...(await generateHooks(config)));
  }

  if (config.generateCommands) {
    allFiles.push(...(await generateCommands(config)));
  }

  const written = await writeFiles(allFiles, config.projectRoot, overwrite);

  // Agent teams: update user-level ~/.claude/settings.json (outside project root)
  await configureAgentTeams(config);

  // Track generated files for audit (F11)
  config.generatedFiles.push(...written);

  console.log(`[ai-init] post-create complete. ${written.length} files written.`);
  return written;
}
