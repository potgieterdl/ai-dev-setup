import path from "node:path";
import type { ProjectConfig } from "./types.js";

/**
 * Returns a fully-populated default ProjectConfig.
 * The wizard starts with these defaults and overrides per user choices.
 */
export function defaultConfig(projectRoot: string): ProjectConfig {
  return {
    selectedMcps: ["taskmaster"],
    taskTracker: "taskmaster",
    architecture: "skip",
    hasPrd: false,
    generateDocs: true,
    generateRules: true,
    generateSkills: true,
    generateHooks: true,
    generateCommands: true,
    agentTeamsEnabled: false,
    runAudit: true,
    hasApiDocs: false,
    hasDatabase: false,
    projectName: path.basename(projectRoot),
    projectRoot,
    generatedFiles: [],
  };
}
