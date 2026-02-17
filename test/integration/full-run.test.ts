import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CLI_PATH = path.resolve("./dist/cli.js");

/**
 * Run the ai-init CLI against a temporary directory with env overrides.
 * Always includes SETUP_AI_NONINTERACTIVE=1 and SETUP_AI_SKIP_AUDIT=1
 * to prevent prompt hangs and API calls during tests.
 */
async function runCli(
  args: string[],
  cwd: string,
  env: Record<string, string> = {}
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("node", [CLI_PATH, ...args], {
    cwd,
    env: {
      ...process.env,
      SETUP_AI_NONINTERACTIVE: "1",
      SETUP_AI_SKIP_AUDIT: "1",
      ...env,
    },
    timeout: 30_000,
  });
}

/**
 * Helper to read a file from the temp directory.
 */
async function readFile(tempDir: string, relPath: string): Promise<string> {
  return fs.readFile(path.join(tempDir, relPath), "utf8");
}

/**
 * Helper to check if a file exists in the temp directory.
 */
async function fileExists(tempDir: string, relPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(tempDir, relPath));
    return true;
  } catch {
    return false;
  }
}

describe("ai-init integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-init-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // ── Subtask 19.1 & 19.2: Infrastructure + Smoke Tests ─────────────────

  describe("smoke: non-interactive mode", () => {
    it("smoke: creates core files with default config", async () => {
      await runCli([], tempDir);

      const coreFiles = [".mcp.json", ".vscode/mcp.json", "CLAUDE.md", "CLAUDE_MCP.md"];
      for (const file of coreFiles) {
        expect(await fileExists(tempDir, file)).toBe(true);
      }
    });

    it("smoke: generates devcontainer config", async () => {
      await runCli([], tempDir);

      expect(await fileExists(tempDir, ".devcontainer/devcontainer.json")).toBe(true);
      const content = await readFile(tempDir, ".devcontainer/devcontainer.json");
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty("image");
    });

    it("smoke: CLI exits with code 0", async () => {
      const { stdout } = await runCli([], tempDir);
      expect(stdout).toContain("[ai-init]");
    });
  });

  // ── Subtask 19.3: MCP Configuration Tests ─────────────────────────────

  describe("demo: MCP configuration", () => {
    it("demo: .mcp.json is valid JSON with mcpServers root key", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "taskmaster,context7" });

      const content = await readFile(tempDir, ".mcp.json");
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty("mcpServers");
      expect(parsed.mcpServers).toHaveProperty("taskmaster-ai");
      expect(parsed.mcpServers).toHaveProperty("context7");
    });

    it("demo: .vscode/mcp.json uses servers root key and VS Code format", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "taskmaster,context7" });

      const content = await readFile(tempDir, ".vscode/mcp.json");
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty("servers");
      expect(parsed.servers).toHaveProperty("taskmaster-ai");
      expect(parsed.servers).toHaveProperty("context7");

      // VS Code format should have cwd and envFile
      const tmEntry = parsed.servers["taskmaster-ai"];
      expect(tmEntry.cwd).toBe("${workspaceFolder}");
      expect(tmEntry.envFile).toBe("${workspaceFolder}/.env");
      expect(tmEntry.type).toBe("stdio");
    });

    it("demo: MCP entries use npx command with correct packages", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "taskmaster,browsermcp" });

      const content = await readFile(tempDir, ".mcp.json");
      const parsed = JSON.parse(content);

      const tm = parsed.mcpServers["taskmaster-ai"];
      expect(tm.command).toBe("npx");
      expect(tm.args).toContain("task-master-ai");

      const browser = parsed.mcpServers["browsermcp"];
      expect(browser.command).toBe("npx");
      expect(browser.args).toContain("@anthropic-ai/mcp-server-puppeteer");
    });

    it("demo: taskmaster MCP includes env vars for API keys", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "taskmaster" });

      const content = await readFile(tempDir, ".mcp.json");
      const parsed = JSON.parse(content);

      const tm = parsed.mcpServers["taskmaster-ai"];
      expect(tm.env).toHaveProperty("ANTHROPIC_API_KEY");
      expect(tm.env).toHaveProperty("TASK_MASTER_TOOLS", "all");
    });

    it("demo: selecting all 5 MCP servers creates all entries", async () => {
      await runCli([], tempDir, {
        SETUP_AI_MCPS: "taskmaster,beads,context7,browsermcp,sequential-thinking",
      });

      const content = await readFile(tempDir, ".mcp.json");
      const parsed = JSON.parse(content);

      expect(Object.keys(parsed.mcpServers)).toHaveLength(5);
      expect(parsed.mcpServers).toHaveProperty("taskmaster-ai");
      expect(parsed.mcpServers).toHaveProperty("beads");
      expect(parsed.mcpServers).toHaveProperty("context7");
      expect(parsed.mcpServers).toHaveProperty("browsermcp");
      expect(parsed.mcpServers).toHaveProperty("sequential-thinking");
    });
  });

  // ── Subtask 19.4: Task Tracker Content Tests ──────────────────────────

  describe("demo: task tracker configuration", () => {
    it("demo: taskmaster tracker generates accurate CLAUDE.md instructions", async () => {
      await runCli([], tempDir, {
        SETUP_AI_TRACKER: "taskmaster",
        SETUP_AI_MCPS: "taskmaster",
      });

      const claudeMd = await readFile(tempDir, "CLAUDE.md");
      expect(claudeMd).toContain("Task Master AI");
      expect(claudeMd).toContain("task-master next");
      expect(claudeMd).toContain("@./.taskmaster/CLAUDE.md");
      expect(claudeMd).toContain("task-master set-status");
    });

    it("demo: beads tracker generates accurate CLAUDE.md instructions", async () => {
      await runCli([], tempDir, {
        SETUP_AI_TRACKER: "beads",
        SETUP_AI_MCPS: "beads",
      });

      const claudeMd = await readFile(tempDir, "CLAUDE.md");
      expect(claudeMd).toContain("Beads");
      expect(claudeMd).toContain("bd sync");
      expect(claudeMd).toContain("beads_ready");
      expect(claudeMd).toContain("beads_create");
    });

    it("demo: markdown tracker generates TASKS.md and matching CLAUDE.md", async () => {
      await runCli([], tempDir, {
        SETUP_AI_TRACKER: "markdown",
        SETUP_AI_MCPS: "",
      });

      const claudeMd = await readFile(tempDir, "CLAUDE.md");
      expect(claudeMd).toContain("Simple Markdown");
      expect(claudeMd).toContain("TASKS.md");

      // markdown tracker should generate TASKS.md via docs generator
      expect(await fileExists(tempDir, "TASKS.md")).toBe(true);
    });

    it("demo: CLAUDE_MCP.md contains correct MCP server documentation", async () => {
      await runCli([], tempDir, {
        SETUP_AI_MCPS: "taskmaster,context7",
      });

      const mcpDoc = await readFile(tempDir, "CLAUDE_MCP.md");
      expect(mcpDoc).toContain("# MCP Servers Available");
      expect(mcpDoc).toContain("taskmaster-ai");
      expect(mcpDoc).toContain("context7");
      expect(mcpDoc).toContain("task-master-ai");
      expect(mcpDoc).toContain("@upstash/context7-mcp");
    });
  });

  // ── Subtask 19.5: Document Scaffolding Tests ──────────────────────────

  describe("demo: document scaffolding", () => {
    it("demo: generates all doc template files", async () => {
      await runCli([], tempDir);

      const docFiles = [
        "docs/doc_format.md",
        "docs/prd.md",
        "docs/architecture.md",
        "docs/testing_strategy.md",
        "docs/onboarding.md",
        "docs/cuj.md",
      ];

      for (const file of docFiles) {
        expect(await fileExists(tempDir, file)).toBe(true);
      }
    });

    it("demo: generates ADR template directory", async () => {
      await runCli([], tempDir);

      expect(await fileExists(tempDir, "docs/adr/adr_template.md")).toBe(true);
      const adrContent = await readFile(tempDir, "docs/adr/adr_template.md");
      expect(adrContent).toContain("Status");
      expect(adrContent).toContain("Context");
      expect(adrContent).toContain("Decision");
    });

    it("demo: doc_format.md contains agent-consumable structure guidance", async () => {
      await runCli([], tempDir);

      const content = await readFile(tempDir, "docs/doc_format.md");
      expect(content).toContain("TOC");
      expect(content.length).toBeGreaterThan(50);
    });

    it("demo: testing_strategy.md includes integration-first philosophy", async () => {
      await runCli([], tempDir);

      const content = await readFile(tempDir, "docs/testing_strategy.md");
      expect(content.toLowerCase()).toContain("integration");
    });

    it("demo: generates API docs when architecture supports it", async () => {
      await runCli([], tempDir, { SETUP_AI_ARCH: "3-tier" });

      expect(await fileExists(tempDir, "docs/api.md")).toBe(true);
    });

    it("demo: skips API docs for monolith architecture", async () => {
      await runCli([], tempDir, { SETUP_AI_ARCH: "monolith" });

      expect(await fileExists(tempDir, "docs/api.md")).toBe(false);
    });
  });

  // ── Subtask 19.6: Rules/Skills/Hooks Generation Tests ─────────────────

  describe("demo: rules, skills, and hooks generation", () => {
    it("demo: testing.md rule includes integration-first philosophy", async () => {
      await runCli([], tempDir);

      const testingRule = await readFile(tempDir, ".claude/rules/testing.md");
      expect(testingRule).toContain("Integration Tests");
      expect(testingRule).toContain("Demo Checkpoints");
      expect(testingRule).toContain("demo:");
    });

    it("demo: always-generated rules exist with correct path-scoped frontmatter", async () => {
      await runCli([], tempDir);

      const alwaysRules = [
        "general.md",
        "docs.md",
        "testing.md",
        "git.md",
        "security.md",
        "config.md",
      ];

      for (const rule of alwaysRules) {
        const rulePath = `.claude/rules/${rule}`;
        expect(await fileExists(tempDir, rulePath)).toBe(true);
        const content = await readFile(tempDir, rulePath);
        // All rules should have YAML frontmatter
        expect(content).toMatch(/^---/);
      }
    });

    it("demo: conditional database rule generated for 3-tier architecture", async () => {
      await runCli([], tempDir, { SETUP_AI_ARCH: "3-tier" });

      expect(await fileExists(tempDir, ".claude/rules/database.md")).toBe(true);
    });

    it("demo: database rule NOT generated for skip architecture", async () => {
      await runCli([], tempDir, { SETUP_AI_ARCH: "skip" });

      expect(await fileExists(tempDir, ".claude/rules/database.md")).toBe(false);
    });

    it("demo: skills are generated with keyword-activated descriptions", async () => {
      await runCli([], tempDir);

      const skillFiles = ["testing.md", "commit.md", "task-workflow.md"];

      for (const skill of skillFiles) {
        const skillPath = `.claude/skills/${skill}`;
        expect(await fileExists(tempDir, skillPath)).toBe(true);
      }
    });

    it("demo: pre-commit hook is generated and executable", async () => {
      await runCli([], tempDir);

      expect(await fileExists(tempDir, ".claude/hooks/pre-commit.sh")).toBe(true);
      const content = await readFile(tempDir, ".claude/hooks/pre-commit.sh");
      expect(content).toContain("#!/usr/bin/env bash");
      expect(content).toContain("npm run lint");
      expect(content).toContain("npm test");

      // Check that the file is marked executable
      const stat = await fs.stat(path.join(tempDir, ".claude/hooks/pre-commit.sh"));
      expect(stat.mode & 0o111).toBeGreaterThan(0);
    });

    it("demo: commands /dev-next and /review are generated", async () => {
      await runCli([], tempDir);

      expect(await fileExists(tempDir, ".claude/commands/dev-next.md")).toBe(true);
      expect(await fileExists(tempDir, ".claude/commands/review.md")).toBe(true);

      const devNext = await readFile(tempDir, ".claude/commands/dev-next.md");
      expect(devNext).toContain("next available task");

      const review = await readFile(tempDir, ".claude/commands/review.md");
      expect(review).toContain("git diff");
    });
  });

  // ── Subtask 19.7: Idempotency Tests ───────────────────────────────────

  describe("demo: idempotency", () => {
    it("demo: running CLI twice produces same CLAUDE.md", async () => {
      const env = { SETUP_AI_TRACKER: "taskmaster", SETUP_AI_MCPS: "taskmaster" };

      await runCli([], tempDir, env);
      const firstRun = await readFile(tempDir, "CLAUDE.md");

      await runCli([], tempDir, env);
      const secondRun = await readFile(tempDir, "CLAUDE.md");

      expect(firstRun).toBe(secondRun);
    });

    it("demo: running CLI twice produces same .mcp.json", async () => {
      const env = { SETUP_AI_MCPS: "taskmaster,context7" };

      await runCli([], tempDir, env);
      const firstRun = await readFile(tempDir, ".mcp.json");

      await runCli([], tempDir, env);
      const secondRun = await readFile(tempDir, ".mcp.json");

      expect(firstRun).toBe(secondRun);
    });

    it("demo: generated file count is consistent across runs", async () => {
      const env = { SETUP_AI_MCPS: "taskmaster" };

      const { stdout: out1 } = await runCli([], tempDir, env);
      const match1 = out1.match(/Generated (\d+) files/);

      const { stdout: out2 } = await runCli([], tempDir, env);
      const match2 = out2.match(/Generated (\d+) files/);

      expect(match1).not.toBeNull();
      expect(match2).not.toBeNull();
      expect(match1![1]).toBe(match2![1]);
    });
  });

  // ── Subtask 19.8: CLI Lifecycle Sub-command Tests ─────────────────────

  describe("demo: CLI lifecycle commands", () => {
    it("smoke: post-create command generates files in non-interactive mode", async () => {
      const { stdout } = await runCli(["post-create"], tempDir, {
        SETUP_AI_MCPS: "taskmaster",
      });

      expect(stdout).toContain("[ai-init]");
      expect(await fileExists(tempDir, "CLAUDE.md")).toBe(true);
      expect(await fileExists(tempDir, ".mcp.json")).toBe(true);
    });

    it("smoke: post-start command runs without errors", async () => {
      // post-start uses default config and doesn't need full wizard
      const { stdout } = await runCli(["post-start"], tempDir);
      expect(stdout).toContain("[ai-init] Phase: post-start");
      expect(stdout).toContain("post-start complete");
    });

    it("demo: post-start prints welcome banner with project name", async () => {
      const { stdout } = await runCli(["post-start"], tempDir);
      // The default project name is derived from the temp dir basename
      expect(stdout).toContain("AI-assisted development environment ready");
    });

    it("demo: post-start reads Task Master tasks.json when present", async () => {
      // Pre-create a tasks.json so post-start can read it
      const tasksDir = path.join(tempDir, ".taskmaster/tasks");
      await fs.mkdir(tasksDir, { recursive: true });
      await fs.writeFile(
        path.join(tasksDir, "tasks.json"),
        JSON.stringify({
          tasks: [
            { id: 1, title: "Setup", status: "done" },
            { id: 2, title: "Build", status: "pending" },
          ],
        }),
        "utf8"
      );

      const { stdout } = await runCli(["post-start"], tempDir);
      expect(stdout).toContain("Tasks: 1/2 done");
    });

    it("demo: post-create with --no-audit skips audit step", async () => {
      const { stdout } = await runCli(["post-create", "--no-audit"], tempDir);

      // Should still generate files
      expect(await fileExists(tempDir, "CLAUDE.md")).toBe(true);

      // Stdout should not contain audit-related messages
      expect(stdout).not.toContain("Running AI-powered audit");
    });
  });

  // ── Cross-cutting: CLAUDE.md quality assertions ───────────────────────

  describe("demo: CLAUDE.md content quality", () => {
    it("demo: CLAUDE.md includes quality gate section", async () => {
      await runCli([], tempDir);

      const content = await readFile(tempDir, "CLAUDE.md");
      expect(content).toContain("Quality Gate");
      expect(content).toContain("npm run format");
      expect(content).toContain("npm run lint");
      expect(content).toContain("npm run typecheck");
      expect(content).toContain("npm run build");
      expect(content).toContain("npm test");
    });

    it("demo: CLAUDE.md references doc imports when docs are generated", async () => {
      await runCli([], tempDir);

      const content = await readFile(tempDir, "CLAUDE.md");
      expect(content).toContain("@docs/prd.md");
      expect(content).toContain("@docs/architecture.md");
      expect(content).toContain("@docs/testing_strategy.md");
    });

    it("demo: CLAUDE.md references MCP doc when MCPs are selected", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "taskmaster" });

      const content = await readFile(tempDir, "CLAUDE.md");
      expect(content).toContain("@CLAUDE_MCP.md");
    });

    it("demo: CLAUDE.md references rules section when rules are generated", async () => {
      await runCli([], tempDir);

      const content = await readFile(tempDir, "CLAUDE.md");
      expect(content).toContain(".claude/rules/");
    });
  });
});
