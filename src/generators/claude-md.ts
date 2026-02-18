import type { ProjectConfig, FileDescriptor } from "../types.js";
import { getSelectedServers } from "../registry.js";

/**
 * Build task tracker-specific instructions for CLAUDE.md.
 * Each tracker gets accurate commands and workflow guidance.
 */
function buildTaskTrackerInstructions(config: ProjectConfig): string {
  switch (config.taskTracker) {
    case "taskmaster":
      return `## Task Tracker: Task Master AI

**Import Task Master's workflow commands:**
@./.taskmaster/CLAUDE.md

### Quick Reference

- \`task-master next\` — Get next available task
- \`task-master show <id>\` — View task details
- \`task-master set-status --id=<id> --status=done\` — Mark complete
- \`task-master update-subtask --id=<id> --prompt="..."\` — Log progress
- \`task-master expand --id=<id> --research\` — Break down a task`;

    case "beads":
      return `## Task Tracker: Beads

**Beads MCP tools:** beads_ready, beads_create, beads_show, beads_update, beads_close, beads_dep_add, beads_dep_tree, beads_sync

### Quick Reference

- \`bd show\` — View current tasks
- \`bd next\` — Get next task
- Reference tasks in commits: \`bd-<id>: <what changed> — <value added>\`
- Run \`bd sync\` before push`;

    case "markdown":
      return `## Task Tracker: Simple Markdown

- Edit \`TASKS.md\` directly to manage tasks
- Mark tasks with \`[x]\` when done
- Add a demo command for each task before marking done
- Keep the summary table at the top in sync with task details`;
  }
}

/**
 * Build the MCP servers reference section for CLAUDE.md.
 * Returns empty string if no MCPs are selected.
 */
function buildMcpSection(config: ProjectConfig): string {
  const servers = getSelectedServers(config.selectedMcps);
  if (servers.length === 0) return "";

  const lines = servers.map((s) => `- **${s.claudeMcpName}**: ${s.description}`);
  return `## MCP Servers

@CLAUDE_MCP.md

${lines.join("\n")}`;
}

/**
 * Build doc import references for CLAUDE.md.
 * Uses @import syntax so Claude Code auto-loads them.
 */
function buildDocImports(config: ProjectConfig): string {
  if (!config.generateDocs) return "";

  const imports = [
    "@docs/doc_format.md",
    "@docs/prd.md",
    "@docs/architecture.md",
    "@docs/testing_strategy.md",
    "@docs/onboarding.md",
  ];

  if (config.hasApiDocs) {
    imports.push("@docs/api.md");
  }

  return `## Project Documentation

${imports.join("\n")}`;
}

/**
 * Build rules reference section for CLAUDE.md.
 */
function buildRulesSection(config: ProjectConfig): string {
  if (!config.generateRules) return "";

  return `## Agent Rules

Path-scoped rules in \`.claude/rules/\` auto-load based on the file being edited.
Multiple rules compose — when editing \`src/api/users.ts\`, rules for api, security, and general all load simultaneously.`;
}

/**
 * Build the quality gate section using toolchain-aware commands (F19).
 * Uses the project's detected toolchain for correct language commands.
 */
function buildQualityGate(config: ProjectConfig): string {
  const { toolchain: tc } = config;
  const steps: string[] = [];
  let idx = 1;

  if (tc.format) steps.push(`${idx++}. Format: \`${tc.format}\``);
  if (tc.lint) steps.push(`${idx++}. Lint: \`${tc.lint}\``);
  if (tc.typecheck) steps.push(`${idx++}. Type-check: \`${tc.typecheck}\``);
  if (tc.build) steps.push(`${idx++}. Build: \`${tc.build}\``);
  if (tc.test) steps.push(`${idx++}. Test: \`${tc.test}\``);

  return `## Quality Gate

Before marking any task done:

${steps.join("\n")}

Never mark a task done if any step fails. Fix issues first.`;
}

/**
 * Generate CLAUDE.md and optionally CLAUDE_MCP.md.
 *
 * Pure function — takes ProjectConfig, returns FileDescriptor[].
 * CLAUDE.md is always generated. CLAUDE_MCP.md is generated only when MCPs are selected.
 */
export function generateClaudeMd(config: ProjectConfig): FileDescriptor[] {
  const sections: string[] = ["# Project Instructions for Claude Code", ""];

  const docImports = buildDocImports(config);
  if (docImports) {
    sections.push(docImports, "");
  }

  sections.push(buildTaskTrackerInstructions(config), "");

  // Architecture guidance from AI analysis (F20)
  if (config.analysisResult?.architectureGuidance) {
    sections.push(`## Architecture Notes\n\n${config.analysisResult.architectureGuidance}`, "");
  }

  const mcpSection = buildMcpSection(config);
  if (mcpSection) {
    sections.push(mcpSection, "");
  }

  const rulesSection = buildRulesSection(config);
  if (rulesSection) {
    sections.push(rulesSection, "");
  }

  sections.push(buildQualityGate(config));

  const files: FileDescriptor[] = [
    {
      path: "CLAUDE.md",
      content: sections.join("\n"),
    },
  ];

  // Generate CLAUDE_MCP.md with MCP tool documentation
  const servers = getSelectedServers(config.selectedMcps);
  if (servers.length > 0) {
    const mcpDocs = servers
      .map(
        (s) => `## ${s.claudeMcpName}

${s.description}

**Package:** \`${s.npmPackage}\``
      )
      .join("\n\n---\n\n");

    files.push({
      path: "CLAUDE_MCP.md",
      content: `# MCP Servers Available\n\n${mcpDocs}\n`,
    });
  }

  return files;
}
