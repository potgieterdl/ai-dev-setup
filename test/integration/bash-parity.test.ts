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

async function readFile(tempDir: string, relPath: string): Promise<string> {
  return fs.readFile(path.join(tempDir, relPath), "utf8");
}

async function fileExists(tempDir: string, relPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(tempDir, relPath));
    return true;
  } catch {
    return false;
  }
}

/**
 * Bash-to-TypeScript parity verification (Task 23).
 *
 * Verifies that the TypeScript CLI (`ai-init`) conceptually matches
 * the functionality of the legacy bash script (`setup-ai.sh`).
 *
 * The TS version is a superset — it adds features not in bash (doc scaffolding,
 * rules, skills, hooks, agent teams, audit). These tests verify that all
 * bash-equivalent functionality is present and correct.
 */
describe("bash-to-typescript parity", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-init-parity-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // ── MCP Registry Parity ───────────────────────────────────────────────

  describe("MCP registry parity", () => {
    it("parity: all 4 original bash MCPs are present in TS output", async () => {
      await runCli([], tempDir, {
        SETUP_AI_MCPS: "taskmaster,context7,browsermcp,sequential-thinking",
      });

      const content = await readFile(tempDir, ".mcp.json");
      const parsed = JSON.parse(content);

      // These 4 MCPs were in the bash MCP_REGISTRY
      expect(parsed.mcpServers).toHaveProperty("taskmaster-ai");
      expect(parsed.mcpServers).toHaveProperty("context7");
      expect(parsed.mcpServers).toHaveProperty("browsermcp");
      expect(parsed.mcpServers).toHaveProperty("sequential-thinking");
    });

    it("parity: taskmaster uses same npm package and args as bash", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "taskmaster" });

      const content = await readFile(tempDir, ".mcp.json");
      const parsed = JSON.parse(content);
      const tm = parsed.mcpServers["taskmaster-ai"];

      expect(tm.command).toBe("npx");
      expect(tm.args).toContain("-y");
      expect(tm.args).toContain("task-master-ai");
      expect(tm.env).toHaveProperty("TASK_MASTER_TOOLS", "all");
    });

    it("parity: context7 uses same npm package as bash", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "context7" });

      const content = await readFile(tempDir, ".mcp.json");
      const parsed = JSON.parse(content);
      const ctx = parsed.mcpServers["context7"];

      expect(ctx.command).toBe("npx");
      expect(ctx.args).toContain("@upstash/context7-mcp");
    });

    it("parity: browsermcp uses same npm package as bash", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "browsermcp" });

      const content = await readFile(tempDir, ".mcp.json");
      const parsed = JSON.parse(content);
      const browser = parsed.mcpServers["browsermcp"];

      expect(browser.command).toBe("npx");
      expect(browser.args).toContain("@anthropic-ai/mcp-server-puppeteer");
    });

    it("parity: sequential-thinking uses same npm package as bash", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "sequential-thinking" });

      const content = await readFile(tempDir, ".mcp.json");
      const parsed = JSON.parse(content);
      const seq = parsed.mcpServers["sequential-thinking"];

      expect(seq.command).toBe("npx");
      expect(seq.args).toContain("@anthropic-ai/mcp-server-sequential-thinking");
    });

    it("parity: TS adds beads MCP not in bash (enhancement)", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "beads" });

      const content = await readFile(tempDir, ".mcp.json");
      const parsed = JSON.parse(content);
      expect(parsed.mcpServers).toHaveProperty("beads");
    });
  });

  // ── .mcp.json Format Parity ───────────────────────────────────────────

  describe(".mcp.json format parity", () => {
    it("parity: Claude Code format uses mcpServers root key", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "taskmaster" });

      const content = await readFile(tempDir, ".mcp.json");
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty("mcpServers");
    });

    it("parity: VS Code format uses servers root key", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "taskmaster" });

      const content = await readFile(tempDir, ".vscode/mcp.json");
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty("servers");
    });

    it("parity: VS Code format includes cwd, envFile, and type fields", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "taskmaster" });

      const content = await readFile(tempDir, ".vscode/mcp.json");
      const parsed = JSON.parse(content);
      const tm = parsed.servers["taskmaster-ai"];

      expect(tm.cwd).toBe("${workspaceFolder}");
      expect(tm.envFile).toBe("${workspaceFolder}/.env");
      expect(tm.type).toBe("stdio");
    });

    it("parity: VS Code taskmaster env uses ${env:VAR} syntax for API keys", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "taskmaster" });

      const content = await readFile(tempDir, ".vscode/mcp.json");
      const parsed = JSON.parse(content);
      const tm = parsed.servers["taskmaster-ai"];

      // VS Code format should use ${env:...} for API keys
      if (tm.env?.ANTHROPIC_API_KEY) {
        expect(tm.env.ANTHROPIC_API_KEY).toMatch(/\$\{env:ANTHROPIC_API_KEY\}/);
      }
    });
  });

  // ── CLAUDE.md Parity ──────────────────────────────────────────────────

  describe("CLAUDE.md parity", () => {
    it("parity: CLAUDE.md includes Task Master instructions like bash", async () => {
      await runCli([], tempDir, {
        SETUP_AI_TRACKER: "taskmaster",
        SETUP_AI_MCPS: "taskmaster",
      });

      const content = await readFile(tempDir, "CLAUDE.md");
      expect(content).toContain("Task Master");
      expect(content).toContain("task-master next");
    });

    it("parity: CLAUDE_MCP.md generated with server documentation", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "taskmaster" });

      const content = await readFile(tempDir, "CLAUDE_MCP.md");
      expect(content).toContain("# MCP Servers Available");
      expect(content).toContain("taskmaster-ai");
    });

    it("parity: CLAUDE.md references quality gate (format/lint/typecheck/build/test)", async () => {
      await runCli([], tempDir);

      const content = await readFile(tempDir, "CLAUDE.md");
      expect(content).toContain("Quality Gate");
      expect(content).toContain("npm run format");
      expect(content).toContain("npm run lint");
      expect(content).toContain("npm run build");
      expect(content).toContain("npm test");
    });
  });

  // ── Devcontainer Parity ───────────────────────────────────────────────

  describe("devcontainer parity", () => {
    it("parity: devcontainer uses ai-init lifecycle commands", async () => {
      await runCli([], tempDir);

      const content = await readFile(tempDir, ".devcontainer/devcontainer.json");
      const parsed = JSON.parse(content);

      expect(parsed.onCreateCommand).toBe("ai-init on-create");
      expect(parsed.postCreateCommand).toBe("ai-init post-create");
      expect(parsed.postStartCommand).toBe("ai-init post-start");
    });

    it("parity: devcontainer includes ANTHROPIC_API_KEY in secrets", async () => {
      await runCli([], tempDir);

      const content = await readFile(tempDir, ".devcontainer/devcontainer.json");
      const parsed = JSON.parse(content);

      expect(parsed.secrets).toHaveProperty("ANTHROPIC_API_KEY");
    });

    it("parity: devcontainer forwards env vars via containerEnv and remoteEnv", async () => {
      await runCli([], tempDir);

      const content = await readFile(tempDir, ".devcontainer/devcontainer.json");
      const parsed = JSON.parse(content);

      expect(parsed.containerEnv).toHaveProperty("ANTHROPIC_API_KEY");
      expect(parsed.remoteEnv).toHaveProperty("ANTHROPIC_API_KEY");

      // Values should use ${localEnv:...} syntax
      expect(parsed.containerEnv.ANTHROPIC_API_KEY).toBe("${localEnv:ANTHROPIC_API_KEY}");
    });

    it("parity: devcontainer uses universal image with Node.js", async () => {
      await runCli([], tempDir);

      const content = await readFile(tempDir, ".devcontainer/devcontainer.json");
      const parsed = JSON.parse(content);

      expect(parsed.image).toContain("mcr.microsoft.com/devcontainers/universal");
      expect(parsed.features).toHaveProperty("ghcr.io/devcontainers/features/node:1");
    });

    it("parity: devcontainer includes VS Code extensions for Copilot", async () => {
      await runCli([], tempDir);

      const content = await readFile(tempDir, ".devcontainer/devcontainer.json");
      const parsed = JSON.parse(content);

      const extensions = parsed.customizations?.vscode?.extensions ?? [];
      expect(extensions).toContain("GitHub.copilot");
      expect(extensions).toContain("GitHub.copilot-chat");
    });
  });

  // ── Lifecycle Phase Parity ────────────────────────────────────────────

  describe("lifecycle phase parity", () => {
    it("parity: post-start generates welcome banner", async () => {
      const { stdout } = await runCli(["post-start"], tempDir);

      expect(stdout).toContain("AI-assisted development environment ready");
    });

    it("parity: post-start reads task progress from tasks.json", async () => {
      // Simulate existing tasks.json (like bash's print_welcome_banner)
      const tasksDir = path.join(tempDir, ".taskmaster/tasks");
      await fs.mkdir(tasksDir, { recursive: true });
      await fs.writeFile(
        path.join(tasksDir, "tasks.json"),
        JSON.stringify({
          tasks: [
            { id: 1, title: "Setup", status: "done" },
            { id: 2, title: "Build", status: "pending" },
            { id: 3, title: "Test", status: "in-progress" },
          ],
        }),
        "utf8"
      );

      const { stdout } = await runCli(["post-start"], tempDir);
      expect(stdout).toContain("Tasks: 1/3 done");
      expect(stdout).toContain("Pending: 1");
      expect(stdout).toContain("In progress: 1");
    });

    it("parity: post-create generates all core files", async () => {
      await runCli(["post-create"], tempDir, { SETUP_AI_MCPS: "taskmaster" });

      const coreFiles = [
        ".mcp.json",
        ".vscode/mcp.json",
        "CLAUDE.md",
        "CLAUDE_MCP.md",
        ".devcontainer/devcontainer.json",
      ];

      for (const file of coreFiles) {
        expect(await fileExists(tempDir, file)).toBe(true);
      }
    });
  });

  // ── Non-Interactive Mode Parity ───────────────────────────────────────

  describe("non-interactive mode parity", () => {
    it("parity: SETUP_AI_MCPS env var selects specific MCPs", async () => {
      await runCli([], tempDir, { SETUP_AI_MCPS: "taskmaster,context7" });

      const content = await readFile(tempDir, ".mcp.json");
      const parsed = JSON.parse(content);

      expect(Object.keys(parsed.mcpServers)).toHaveLength(2);
      expect(parsed.mcpServers).toHaveProperty("taskmaster-ai");
      expect(parsed.mcpServers).toHaveProperty("context7");
    });

    it("parity: SETUP_AI_NONINTERACTIVE=1 runs without prompts", async () => {
      // This test verifies the command runs successfully in non-interactive mode
      const { stdout } = await runCli([], tempDir);
      expect(stdout).toContain("[ai-init]");
      expect(stdout).toContain("post-create complete");
    });
  });

  // ── TS Enhancements Over Bash ─────────────────────────────────────────

  describe("TS enhancements (not in bash)", () => {
    it("enhancement: doc scaffolding generates full doc template set", async () => {
      await runCli([], tempDir);

      const enhancedDocs = [
        "docs/doc_format.md",
        "docs/prd.md",
        "docs/architecture.md",
        "docs/testing_strategy.md",
        "docs/onboarding.md",
        "docs/cuj.md",
        "docs/adr/adr_template.md",
      ];

      for (const file of enhancedDocs) {
        expect(await fileExists(tempDir, file)).toBe(true);
      }
    });

    it("enhancement: path-scoped rules generation", async () => {
      await runCli([], tempDir);

      const rules = [
        ".claude/rules/general.md",
        ".claude/rules/testing.md",
        ".claude/rules/git.md",
        ".claude/rules/security.md",
      ];

      for (const rule of rules) {
        expect(await fileExists(tempDir, rule)).toBe(true);
      }
    });

    it("enhancement: skills and hooks generation", async () => {
      await runCli([], tempDir);

      expect(await fileExists(tempDir, ".claude/skills/testing.md")).toBe(true);
      expect(await fileExists(tempDir, ".claude/skills/commit.md")).toBe(true);
      expect(await fileExists(tempDir, ".claude/hooks/pre-commit.sh")).toBe(true);
    });

    it("enhancement: custom slash commands generation", async () => {
      await runCli([], tempDir);

      expect(await fileExists(tempDir, ".claude/commands/dev-next.md")).toBe(true);
      expect(await fileExists(tempDir, ".claude/commands/review.md")).toBe(true);
    });

    it("enhancement: boot-prompt.txt is NOT generated (removed in F12)", async () => {
      await runCli([], tempDir);

      expect(await fileExists(tempDir, ".claude/boot-prompt.txt")).toBe(false);
    });
  });
});
