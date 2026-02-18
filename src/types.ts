/**
 * Core types shared across all generators, phases, and the wizard.
 * The central ProjectConfig type drives all code generation.
 */

/** Supported package manager names */
export type PackageManagerName = "npm" | "pnpm" | "yarn" | "bun";

/** Package manager command abstraction */
export interface PackageManager {
  name: PackageManagerName;
  /** CI install command, e.g. "npm ci" or "pnpm install --frozen-lockfile" */
  install: string;
  /** Global install prefix, e.g. "npm install -g" or "pnpm add -g" */
  installGlobal: string;
  /** Script run command, e.g. "npm run" or "pnpm" */
  run: string;
  /** Package executor, e.g. "npx" or "pnpm dlx" */
  exec: string;
  /** Lock file name, e.g. "package-lock.json" or "pnpm-lock.yaml" */
  lockFile: string;
  /** Run script with --if-present flag, e.g. "npm run --if-present" */
  runIfPresent: string;
  /** Test command, e.g. "npm test" or "pnpm test" */
  test: string;
}

/** Raw filesystem signals gathered by src/detect.ts (F20) */
export interface DetectionResult {
  hasPackageJson: boolean;
  hasTsConfig: boolean;
  hasDockerCompose: boolean;
  hasPrismaSchema: boolean;
  hasGraphqlConfig: boolean;
  /** Top-level directories under src/ (or project root if no src/) */
  directories: string[];
  /** Detected config files present in the project */
  configFiles: string[];
  /** Detected frameworks from package.json, e.g. ["express", "next"] */
  frameworks: string[];
  /** Detected ORMs from package.json, e.g. ["prisma", "drizzle"] */
  orms: string[];
  /** Detected test frameworks from package.json, e.g. ["vitest", "jest"] */
  testFrameworks: string[];
}

/** Known rule slugs that the analysis step can recommend */
export const KNOWN_RULES = [
  "general",
  "api",
  "database",
  "testing",
  "security",
  "git",
  "config",
  "docs",
  "agent-teams",
] as const;
export type KnownRule = (typeof KNOWN_RULES)[number];

/** Known hook step names that the analysis step can recommend */
export const KNOWN_HOOK_STEPS = ["format", "lint", "typecheck", "build", "test"] as const;
export type KnownHookStep = (typeof KNOWN_HOOK_STEPS)[number];

/** Structured output from claude --model haiku analysis, validated by Zod (F20) */
export interface ProjectAnalysis {
  detectedArchitecture: "monolith" | "2-tier" | "3-tier" | "microservices";
  /** Glob patterns for API-related paths, e.g. ["src/routes/**", "src/api/**"] */
  apiPaths: string[];
  /** Glob patterns for database-related paths, e.g. ["prisma/**", "src/db/**"] */
  dbPaths: string[];
  /** Glob patterns for test-related paths, e.g. ["src/__tests__/**", "test/**"] */
  testPaths: string[];
  /** 2-3 sentence architecture guidance for CLAUDE.md */
  architectureGuidance: string;
  /** Subset of KNOWN_RULES to generate */
  recommendedRules: string[];
  /** Subset of KNOWN_HOOK_STEPS to include in pre-commit */
  hookSteps: string[];
}

/** Supported task tracker integrations */
export type TaskTracker = "taskmaster" | "beads" | "markdown";

/** Architecture tier selection from wizard Step 4 */
export type Architecture = "monolith" | "2-tier" | "3-tier" | "microservices" | "skip";

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

  // Granular opt-in selections (F13)
  selectedRules: string[];
  selectedHookSteps: string[];
  selectedSkills: string[];

  // Derived from selections
  hasApiDocs: boolean;
  hasDatabase: boolean;

  // Package manager (F15)
  pm: PackageManager;

  // Project metadata
  projectName: string;
  projectRoot: string;

  // AI-powered project analysis (F20)
  /** Whether this is an existing project (triggers codebase scanning) */
  isExistingProject: boolean;
  /** Whether Claude Code is authenticated for AI features */
  claudeAuthenticated: boolean;
  /** Result of AI-powered project analysis (populated when haiku analysis succeeds) */
  analysisResult?: ProjectAnalysis;

  // Tracking for audit (F11)
  generatedFiles: string[];
}

/**
 * Persisted wizard state written to .ai-init.json after first run (F16).
 * The `update` subcommand reads this to enable diff-based re-configuration.
 */
export interface SavedConfig {
  /** semver of ai-init that wrote this file */
  version: string;
  selectedMcps: string[];
  taskTracker: TaskTracker;
  architecture: Architecture;
  /** Granular rule selections from F13 */
  selectedRules: string[];
  /** Granular hook step selections from F13 */
  selectedHookSteps: string[];
  /** Granular skill selections from F13 */
  selectedSkills: string[];
  /** Package manager name, e.g. "npm" */
  pm: PackageManagerName;
  agentTeamsEnabled: boolean;
  /** ISO 8601 timestamp of when config was written */
  generatedAt: string;
}

/** A single health check result (F17: doctor command) */
export interface CheckResult {
  status: "pass" | "warn" | "error";
  message: string;
}

/** A named category of health checks (F17: doctor command) */
export interface HealthCheck {
  category: string;
  results: CheckResult[];
}

/** Structured output from the Claude Code headless audit (F11) */
export interface AuditResult {
  passes: string[];
  fills: { file: string; section: string; message: string }[];
  fixes: { file: string; issue: string; fix: string }[];
  postSetupChecklist: string[];
}
