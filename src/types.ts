/**
 * Core types shared across all generators, phases, and the wizard.
 * The central ProjectConfig type drives all code generation.
 */

/** Supported task tracker integrations */
export type TaskTracker = "taskmaster" | "beads" | "markdown";

/** Architecture tier selection from wizard Step 4 */
export type Architecture =
  | "monolith"
  | "2-tier"
  | "3-tier"
  | "microservices"
  | "skip";

/** MCP server definition from the registry */
export interface McpServer {
  name: string;
  description: string;
  npmPackage: string;
  claudeMcpName: string;
  required: boolean;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Output of a generator — a file to be written to disk.
 * Generators return FileDescriptor[] and never touch the filesystem directly.
 */
export interface FileDescriptor {
  path: string;
  content: string;
  executable?: boolean;
}

/**
 * Central configuration object populated by the wizard.
 * Every generator and phase receives this to determine what to produce.
 */
export interface ProjectConfig {
  // MCP selections
  selectedMcps: string[];

  // Task tracker
  taskTracker: TaskTracker;

  // Architecture
  architecture: Architecture;

  // PRD
  prdPath?: string;
  hasPrd: boolean;

  // Feature flags
  generateDocs: boolean;
  generateRules: boolean;
  generateSkills: boolean;
  generateHooks: boolean;
  generateCommands: boolean;
  agentTeamsEnabled: boolean;
  runAudit: boolean;

  // Derived from selections
  hasApiDocs: boolean;
  hasDatabase: boolean;

  // Project metadata
  projectName: string;
  projectRoot: string;

  // Tracking for audit (F11)
  generatedFiles: string[];
}

/** Structured output from the Claude Code headless audit (F11) */
export interface AuditResult {
  passes: string[];
  fills: { file: string; section: string; message: string }[];
  fixes: { file: string; issue: string; fix: string }[];
  postSetupChecklist: string[];
}
