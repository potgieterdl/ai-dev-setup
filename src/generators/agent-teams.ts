import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { ProjectConfig } from "../types.js";

/**
 * Configure Claude Code agent teams mode (F10).
 *
 * Updates ~/.claude/settings.json (user-level setting) to set the
 * CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 environment flag.
 *
 * This is separate from the rules generator because ~/.claude/settings.json
 * lives outside the project root and cannot go through the normal
 * writeFiles() mechanism.
 *
 * The agent-teams.md rule file itself is handled by generateRules() in
 * src/generators/rules.ts when agentTeamsEnabled is true.
 *
 * @param config - Project configuration (reads agentTeamsEnabled flag)
 * @param settingsPath - Override path for testing (defaults to ~/.claude/settings.json)
 */
export async function configureAgentTeams(
  config: ProjectConfig,
  settingsPath?: string
): Promise<void> {
  if (!config.agentTeamsEnabled) return;

  const targetPath = settingsPath ?? path.join(os.homedir(), ".claude", "settings.json");

  // Read existing settings (may not exist yet)
  let existing: Record<string, unknown> = {};
  try {
    const content = await fs.readFile(targetPath, "utf8");
    existing = JSON.parse(content) as Record<string, unknown>;
  } catch {
    // File doesn't exist or isn't valid JSON — start fresh
  }

  // Merge the agent teams env flag into existing settings
  const merged = {
    ...existing,
    env: {
      ...((existing.env as Record<string, string>) ?? {}),
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
    },
  };

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, JSON.stringify(merged, null, 2) + "\n", "utf8");

  console.log("[ai-init] Agent teams mode enabled in ~/.claude/settings.json");
}
