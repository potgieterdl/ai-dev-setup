import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import {
  checkMcpConfig,
  checkAgentInstructions,
  checkRulesAndSkills,
  checkHooks,
  checkTaskTracker,
  checkDocumentation,
  checkDependencies,
  runDoctor,
  printDoctorReport,
} from "../src/doctor.js";
import { fileExists, isExecutable, isValidJson } from "../src/utils.js";
import { getRequiredEnvVars } from "../src/registry.js";
import type { HealthCheck } from "../src/types.js";

// ─── Helper: create temp dir per test ──────────────────────────────────────

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-init-doctor-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ─── Utility helper tests ──────────────────────────────────────────────────

describe("fileExists", () => {
  it("returns true for an existing file", async () => {
    await fs.writeFile(path.join(tmpDir, "exists.txt"), "hello", "utf8");
    expect(await fileExists(path.join(tmpDir, "exists.txt"))).toBe(true);
  });

  it("returns false for a missing file", async () => {
    expect(await fileExists(path.join(tmpDir, "nope.txt"))).toBe(false);
  });
});

describe("isExecutable", () => {
  it("returns true after chmod 755", async () => {
    const f = path.join(tmpDir, "run.sh");
    await fs.writeFile(f, "#!/bin/bash\necho hi", "utf8");
    await fs.chmod(f, 0o755);
    expect(await isExecutable(f)).toBe(true);
  });

  it("returns false after chmod 644", async () => {
    const f = path.join(tmpDir, "nope.sh");
    await fs.writeFile(f, "#!/bin/bash\necho hi", "utf8");
    await fs.chmod(f, 0o644);
    expect(await isExecutable(f)).toBe(false);
  });

  it("returns false for missing file", async () => {
    expect(await isExecutable(path.join(tmpDir, "missing.sh"))).toBe(false);
  });
});

describe("isValidJson", () => {
  it("returns true for valid JSON", () => {
    expect(isValidJson("{}")).toBe(true);
    expect(isValidJson('{"key":"value"}')).toBe(true);
    expect(isValidJson("[]")).toBe(true);
  });

  it("returns false for invalid JSON", () => {
    expect(isValidJson("{broken")).toBe(false);
    expect(isValidJson("")).toBe(false);
    expect(isValidJson("not json")).toBe(false);
  });
});

// ─── getRequiredEnvVars tests ──────────────────────────────────────────────

describe("getRequiredEnvVars", () => {
  it("returns env var names for taskmaster", () => {
    const vars = getRequiredEnvVars("taskmaster");
    expect(vars).toContain("ANTHROPIC_API_KEY");
    expect(vars).toContain("PERPLEXITY_API_KEY");
  });

  it("returns empty array for servers with no env vars", () => {
    expect(getRequiredEnvVars("context7")).toEqual([]);
  });

  it("returns empty array for unknown server name", () => {
    expect(getRequiredEnvVars("nonexistent-server")).toEqual([]);
  });
});

// ─── checkMcpConfig tests ──────────────────────────────────────────────────

describe("checkMcpConfig", () => {
  it("passes for valid .mcp.json and .vscode/mcp.json", async () => {
    await fs.writeFile(path.join(tmpDir, ".mcp.json"), JSON.stringify({ mcpServers: {} }), "utf8");
    await fs.mkdir(path.join(tmpDir, ".vscode"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, ".vscode/mcp.json"),
      JSON.stringify({ servers: {} }),
      "utf8"
    );

    const result = await checkMcpConfig(tmpDir);
    expect(result.category).toBe("MCP Configuration");
    const passMessages = result.results.filter((r) => r.status === "pass").map((r) => r.message);
    expect(passMessages).toContain(".mcp.json is valid JSON");
    expect(passMessages).toContain(".vscode/mcp.json is valid JSON");
  });

  it("errors on invalid JSON in .mcp.json", async () => {
    await fs.writeFile(path.join(tmpDir, ".mcp.json"), "{broken", "utf8");

    const result = await checkMcpConfig(tmpDir);
    const errors = result.results.filter((r) => r.status === "error");
    expect(errors.some((r) => r.message.includes(".mcp.json is not valid JSON"))).toBe(true);
  });

  it("warns when .vscode/mcp.json is missing", async () => {
    await fs.writeFile(path.join(tmpDir, ".mcp.json"), JSON.stringify({ mcpServers: {} }), "utf8");

    const result = await checkMcpConfig(tmpDir);
    const warns = result.results.filter((r) => r.status === "warn");
    expect(warns.some((r) => r.message.includes(".vscode/mcp.json not found"))).toBe(true);
  });

  it("warns on missing API key for configured server", async () => {
    const savedKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      await fs.writeFile(
        path.join(tmpDir, ".mcp.json"),
        JSON.stringify({ mcpServers: { "taskmaster-ai": {} } }),
        "utf8"
      );

      const result = await checkMcpConfig(tmpDir);
      const warns = result.results.filter((r) => r.status === "warn");
      expect(warns.some((r) => r.message.includes("ANTHROPIC_API_KEY not set"))).toBe(true);
    } finally {
      if (savedKey) process.env.ANTHROPIC_API_KEY = savedKey;
    }
  });

  it("reports configured server as pass", async () => {
    await fs.writeFile(
      path.join(tmpDir, ".mcp.json"),
      JSON.stringify({ mcpServers: { "taskmaster-ai": {} } }),
      "utf8"
    );

    const result = await checkMcpConfig(tmpDir);
    const passes = result.results.filter((r) => r.status === "pass");
    expect(passes.some((r) => r.message.includes("taskmaster-ai server configured"))).toBe(true);
  });
});

// ─── checkAgentInstructions tests ──────────────────────────────────────────

describe("checkAgentInstructions", () => {
  it("passes when both files present and short", async () => {
    await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "# Instructions\n".repeat(10), "utf8");
    await fs.writeFile(path.join(tmpDir, "CLAUDE_MCP.md"), "# MCP\n", "utf8");

    const result = await checkAgentInstructions(tmpDir);
    const passes = result.results.filter((r) => r.status === "pass");
    expect(passes.some((r) => r.message.includes("CLAUDE.md exists"))).toBe(true);
    expect(passes.some((r) => r.message.includes("CLAUDE_MCP.md exists"))).toBe(true);
  });

  it("errors when CLAUDE.md is missing", async () => {
    const result = await checkAgentInstructions(tmpDir);
    const errors = result.results.filter((r) => r.status === "error");
    expect(errors.some((r) => r.message.includes("CLAUDE.md not found"))).toBe(true);
  });

  it("warns when CLAUDE.md is over 200 lines", async () => {
    await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "line\n".repeat(201), "utf8");
    await fs.writeFile(path.join(tmpDir, "CLAUDE_MCP.md"), "# MCP\n", "utf8");

    const result = await checkAgentInstructions(tmpDir);
    const warns = result.results.filter((r) => r.status === "warn");
    expect(warns.some((r) => r.message.includes("over 200 lines"))).toBe(true);
  });

  it("errors on broken @import reference", async () => {
    await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "@./.taskmaster/CLAUDE.md\n", "utf8");
    await fs.writeFile(path.join(tmpDir, "CLAUDE_MCP.md"), "# MCP\n", "utf8");

    const result = await checkAgentInstructions(tmpDir);
    const errors = result.results.filter((r) => r.status === "error");
    expect(errors.some((r) => r.message.includes("file not found"))).toBe(true);
  });

  it("passes on valid @import reference", async () => {
    await fs.mkdir(path.join(tmpDir, ".taskmaster"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, ".taskmaster/CLAUDE.md"), "# TM\n", "utf8");
    await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "@./.taskmaster/CLAUDE.md\n", "utf8");
    await fs.writeFile(path.join(tmpDir, "CLAUDE_MCP.md"), "# MCP\n", "utf8");

    const result = await checkAgentInstructions(tmpDir);
    const passes = result.results.filter((r) => r.status === "pass");
    expect(passes.some((r) => r.message.includes("found"))).toBe(true);
  });
});

// ─── checkRulesAndSkills tests ─────────────────────────────────────────────

describe("checkRulesAndSkills", () => {
  it("passes when rules present with no broken imports", async () => {
    await fs.mkdir(path.join(tmpDir, ".claude/rules"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, ".claude/rules/general.md"), "# General\n", "utf8");
    await fs.writeFile(path.join(tmpDir, ".claude/rules/git.md"), "# Git\n", "utf8");
    await fs.mkdir(path.join(tmpDir, ".claude/skills"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, ".claude/skills/testing.md"), "# Testing\n", "utf8");

    const result = await checkRulesAndSkills(tmpDir);
    const passes = result.results.filter((r) => r.status === "pass");
    expect(passes.some((r) => r.message.includes("2 files found in .claude/rules/"))).toBe(true);
    expect(passes.some((r) => r.message.includes("1 files found in .claude/skills/"))).toBe(true);
  });

  it("warns when .claude/rules/ directory is missing", async () => {
    await fs.mkdir(path.join(tmpDir, ".claude/skills"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, ".claude/skills/testing.md"), "# Testing\n", "utf8");

    const result = await checkRulesAndSkills(tmpDir);
    const warns = result.results.filter((r) => r.status === "warn");
    expect(warns.some((r) => r.message.includes(".claude/rules/ directory not found"))).toBe(true);
  });

  it("warns on rule with broken @import", async () => {
    await fs.mkdir(path.join(tmpDir, ".claude/rules"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, ".claude/rules/api.md"), "# API\n@docs/api.md\n", "utf8");
    await fs.mkdir(path.join(tmpDir, ".claude/skills"), { recursive: true });

    const result = await checkRulesAndSkills(tmpDir);
    const warns = result.results.filter((r) => r.status === "warn");
    expect(warns.some((r) => r.message.includes("file missing"))).toBe(true);
  });
});

// ─── checkHooks tests ──────────────────────────────────────────────────────

describe("checkHooks", () => {
  it("passes when hook script exists and is executable", async () => {
    await fs.mkdir(path.join(tmpDir, ".claude/hooks"), { recursive: true });
    const hookPath = path.join(tmpDir, ".claude/hooks/pre-commit.sh");
    await fs.writeFile(hookPath, "#!/bin/bash\necho pass", "utf8");
    await fs.chmod(hookPath, 0o755);
    await fs.writeFile(
      path.join(tmpDir, ".claude/settings.json"),
      JSON.stringify({ hooks: { PreToolUse: [] } }),
      "utf8"
    );

    const result = await checkHooks(tmpDir);
    const passes = result.results.filter((r) => r.status === "pass");
    expect(passes.some((r) => r.message.includes("pre-commit.sh exists"))).toBe(true);
    expect(passes.some((r) => r.message.includes("pre-commit.sh is executable"))).toBe(true);
    expect(passes.some((r) => r.message.includes("settings.json is valid JSON"))).toBe(true);
    expect(passes.some((r) => r.message.includes("hooks configured"))).toBe(true);
  });

  it("errors when hook script is not executable", async () => {
    await fs.mkdir(path.join(tmpDir, ".claude/hooks"), { recursive: true });
    const hookPath = path.join(tmpDir, ".claude/hooks/pre-commit.sh");
    await fs.writeFile(hookPath, "#!/bin/bash\necho pass", "utf8");
    await fs.chmod(hookPath, 0o644);

    const result = await checkHooks(tmpDir);
    const errors = result.results.filter((r) => r.status === "error");
    expect(errors.some((r) => r.message.includes("not executable"))).toBe(true);
  });

  it("warns when no hooks directory exists", async () => {
    const result = await checkHooks(tmpDir);
    const warns = result.results.filter((r) => r.status === "warn");
    expect(warns.some((r) => r.message.includes(".claude/hooks/ directory not found"))).toBe(true);
  });

  it("errors on invalid settings.json", async () => {
    await fs.mkdir(path.join(tmpDir, ".claude"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, ".claude/settings.json"), "{invalid json", "utf8");

    const result = await checkHooks(tmpDir);
    const errors = result.results.filter((r) => r.status === "error");
    expect(errors.some((r) => r.message.includes("settings.json is not valid JSON"))).toBe(true);
  });
});

// ─── checkTaskTracker tests ────────────────────────────────────────────────

describe("checkTaskTracker", () => {
  it("passes with valid tasks.json", async () => {
    await fs.mkdir(path.join(tmpDir, ".taskmaster/tasks"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, ".taskmaster/tasks/tasks.json"),
      JSON.stringify({ tasks: [{ id: 1 }, { id: 2 }] }),
      "utf8"
    );

    const result = await checkTaskTracker(tmpDir);
    const passes = result.results.filter((r) => r.status === "pass");
    expect(passes.some((r) => r.message.includes("Task Master configured"))).toBe(true);
    expect(passes.some((r) => r.message.includes("2 tasks found"))).toBe(true);
  });

  it("errors on invalid tasks.json JSON", async () => {
    await fs.mkdir(path.join(tmpDir, ".taskmaster/tasks"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, ".taskmaster/tasks/tasks.json"), "not json", "utf8");

    const result = await checkTaskTracker(tmpDir);
    const errors = result.results.filter((r) => r.status === "error");
    expect(errors.some((r) => r.message.includes("not valid JSON"))).toBe(true);
  });

  it("passes with TASKS.md only", async () => {
    await fs.writeFile(path.join(tmpDir, "TASKS.md"), "# Tasks\n", "utf8");

    const result = await checkTaskTracker(tmpDir);
    const passes = result.results.filter((r) => r.status === "pass");
    expect(passes.some((r) => r.message.includes("TASKS.md task tracker configured"))).toBe(true);
  });

  it("warns when no tracker is configured", async () => {
    const result = await checkTaskTracker(tmpDir);
    const warns = result.results.filter((r) => r.status === "warn");
    expect(warns.some((r) => r.message.includes("No task tracker configured"))).toBe(true);
  });
});

// ─── checkDocumentation tests ──────────────────────────────────────────────

describe("checkDocumentation", () => {
  it("passes with clean docs/ files", async () => {
    await fs.mkdir(path.join(tmpDir, "docs"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "docs/prd.md"), "# PRD\nMy project.", "utf8");
    await fs.writeFile(path.join(tmpDir, "docs/arch.md"), "# Architecture", "utf8");

    const result = await checkDocumentation(tmpDir);
    const passes = result.results.filter((r) => r.status === "pass");
    expect(passes.some((r) => r.message.includes("2 markdown files"))).toBe(true);
  });

  it("warns on unfilled placeholders", async () => {
    await fs.mkdir(path.join(tmpDir, "docs"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "docs/prd.md"),
      "# {{PROJECT_NAME}}\nDescription here.",
      "utf8"
    );

    const result = await checkDocumentation(tmpDir);
    const warns = result.results.filter((r) => r.status === "warn");
    expect(warns.some((r) => r.message.includes("unfilled placeholders"))).toBe(true);
  });

  it("warns when docs/ directory is missing", async () => {
    const result = await checkDocumentation(tmpDir);
    const warns = result.results.filter((r) => r.status === "warn");
    expect(warns.some((r) => r.message.includes("docs/ directory not found"))).toBe(true);
  });
});

// ─── checkDependencies tests ───────────────────────────────────────────────

describe("checkDependencies", () => {
  it("reports npx as installed (available in test environment)", async () => {
    const result = await checkDependencies();
    expect(result.category).toBe("Dependencies");
    // npx should be available in a Node.js environment
    const npxResult = result.results.find((r) => r.message.includes("npx"));
    expect(npxResult?.status).toBe("pass");
  });
});

// ─── printDoctorReport tests ───────────────────────────────────────────────

describe("printDoctorReport", () => {
  it("returns exit code 0 when all checks pass", () => {
    const checks: HealthCheck[] = [
      {
        category: "Test",
        results: [
          { status: "pass", message: "check 1" },
          { status: "pass", message: "check 2" },
        ],
      },
    ];
    const exitCode = printDoctorReport(checks);
    expect(exitCode).toBe(0);
  });

  it("returns exit code 1 when one error exists", () => {
    const checks: HealthCheck[] = [
      {
        category: "Test",
        results: [
          { status: "pass", message: "check 1" },
          { status: "error", message: "check 2 failed" },
        ],
      },
    ];
    const exitCode = printDoctorReport(checks);
    expect(exitCode).toBe(1);
  });

  it("returns exit code 0 when only warnings exist", () => {
    const checks: HealthCheck[] = [
      {
        category: "Test",
        results: [
          { status: "pass", message: "check 1" },
          { status: "warn", message: "check 2 warning" },
        ],
      },
    ];
    const exitCode = printDoctorReport(checks);
    expect(exitCode).toBe(0);
  });

  it("output contains category headers", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const checks: HealthCheck[] = [
      {
        category: "MCP Configuration",
        results: [{ status: "pass", message: "ok" }],
      },
      {
        category: "Agent Instructions",
        results: [{ status: "pass", message: "ok" }],
      },
    ];

    printDoctorReport(checks);

    const allOutput = consoleSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(allOutput).toContain("MCP Configuration");
    expect(allOutput).toContain("Agent Instructions");
    expect(allOutput).toContain("Summary:");

    consoleSpy.mockRestore();
  });
});

// ─── Integration: runDoctor smoke test ─────────────────────────────────────

describe("runDoctor", () => {
  it("resolves to array of 7 HealthCheck objects on minimal project", async () => {
    // Create a minimal valid project structure
    await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "# Instructions\n", "utf8");
    await fs.writeFile(path.join(tmpDir, "CLAUDE_MCP.md"), "# MCP\n", "utf8");
    await fs.writeFile(path.join(tmpDir, ".mcp.json"), JSON.stringify({ mcpServers: {} }), "utf8");
    await fs.writeFile(path.join(tmpDir, "TASKS.md"), "# Tasks\n", "utf8");

    const checks = await runDoctor(tmpDir);
    expect(checks).toHaveLength(7);
    for (const check of checks) {
      expect(check.category).toBeDefined();
      expect(Array.isArray(check.results)).toBe(true);
    }
  });

  it("never throws on a completely empty directory", async () => {
    const checks = await runDoctor(tmpDir);
    expect(checks).toHaveLength(7);
    // Should have warnings/errors but no uncaught exceptions
    for (const check of checks) {
      expect(check.results.length).toBeGreaterThan(0);
    }
  });
});
