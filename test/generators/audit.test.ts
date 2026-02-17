import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  checkClaudeCodeAvailable,
  installClaudeCode,
  buildAuditPrompt,
  runAudit,
} from "../../src/audit.js";
import * as utils from "../../src/utils.js";
import type { ProjectConfig } from "../../src/types.js";
import { defaultConfig } from "../../src/defaults.js";

describe("checkClaudeCodeAvailable", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false when claude is not on PATH", async () => {
    vi.spyOn(utils, "commandExists").mockResolvedValue(false);
    const result = await checkClaudeCodeAvailable();
    expect(result).toBe(false);
  });

  it("returns true when claude is on PATH and --version succeeds", async () => {
    vi.spyOn(utils, "commandExists").mockResolvedValue(true);
    vi.spyOn(utils, "run").mockResolvedValue("1.0.0");
    const result = await checkClaudeCodeAvailable();
    expect(result).toBe(true);
  });

  it("returns false when claude is on PATH but --version fails", async () => {
    vi.spyOn(utils, "commandExists").mockResolvedValue(true);
    vi.spyOn(utils, "run").mockRejectedValue(new Error("auth failed"));
    const result = await checkClaudeCodeAvailable();
    expect(result).toBe(false);
  });
});

describe("installClaudeCode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls npm install -g @anthropic-ai/claude-code", async () => {
    const runSpy = vi.spyOn(utils, "run").mockResolvedValue("");
    await installClaudeCode();
    expect(runSpy).toHaveBeenCalledWith("npm", ["install", "-g", "@anthropic-ai/claude-code"]);
  });
});

describe("buildAuditPrompt", () => {
  it("replaces {{GENERATED_FILES}} with the file list", () => {
    const prompt = buildAuditPrompt(["CLAUDE.md", ".mcp.json", "docs/prd.md"]);
    expect(prompt).toContain("  - CLAUDE.md");
    expect(prompt).toContain("  - .mcp.json");
    expect(prompt).toContain("  - docs/prd.md");
    expect(prompt).not.toContain("{{GENERATED_FILES}}");
  });

  it("contains all 7 audit checklist items", () => {
    const prompt = buildAuditPrompt(["test.md"]);
    expect(prompt).toContain("1. STRUCTURE:");
    expect(prompt).toContain("2. CROSS-REFERENCES:");
    expect(prompt).toContain("3. RULES CONSISTENCY:");
    expect(prompt).toContain("4. MCP CONFIG:");
    expect(prompt).toContain("5. TEMPLATE COMPLETENESS:");
    expect(prompt).toContain("6. GAPS:");
    expect(prompt).toContain("7. PROMPTS & INSTRUCTIONS:");
  });

  it("contains expected output format markers", () => {
    const prompt = buildAuditPrompt(["test.md"]);
    expect(prompt).toContain("PASS:");
    expect(prompt).toContain("FILL:");
    expect(prompt).toContain("FIX:");
    expect(prompt).toContain("Post-Setup Checklist");
  });

  it("handles an empty file list", () => {
    const prompt = buildAuditPrompt([]);
    expect(prompt).not.toContain("{{GENERATED_FILES}}");
  });
});

describe("runAudit", () => {
  let tmpDir: string;
  let config: ProjectConfig;

  beforeEach(async () => {
    vi.restoreAllMocks();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "audit-test-"));
    config = defaultConfig(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("skips audit when no files were generated", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runAudit(config, []);
    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("no files were generated"));
  });

  it("skips audit when Claude Code is not available", async () => {
    vi.spyOn(utils, "commandExists").mockResolvedValue(false);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runAudit(config, ["CLAUDE.md"]);
    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Claude Code not available"));
  });

  it("catches audit errors and does not throw", async () => {
    vi.spyOn(utils, "commandExists").mockResolvedValue(true);
    vi.spyOn(utils, "run").mockImplementation(async (cmd: string, args: string[]) => {
      if (cmd === "claude" && args[0] === "--version") return "1.0.0";
      if (cmd === "claude" && args[0] === "--print") throw new Error("API auth failed");
      return "";
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await runAudit(config, ["CLAUDE.md"]);
    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Audit failed"));
  });

  it("saves audit output to .ai-init-audit.md on success", async () => {
    const auditResponse = "PASS: STRUCTURE — All docs follow format";
    vi.spyOn(utils, "commandExists").mockResolvedValue(true);
    vi.spyOn(utils, "run").mockImplementation(async (cmd: string, args: string[]) => {
      if (cmd === "claude" && args[0] === "--version") return "1.0.0";
      if (cmd === "claude" && args[0] === "--print") return auditResponse;
      return "";
    });
    vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await runAudit(config, ["CLAUDE.md", ".mcp.json"]);
    expect(result).toBe(auditResponse);

    const savedContent = await fs.readFile(path.join(tmpDir, ".ai-init-audit.md"), "utf8");
    expect(savedContent).toContain("# AI Init Audit Results");
    expect(savedContent).toContain(auditResponse);
  });

  it("calls claude with --print and the audit prompt", async () => {
    vi.spyOn(utils, "commandExists").mockResolvedValue(true);
    const runSpy = vi
      .spyOn(utils, "run")
      .mockImplementation(async (cmd: string, args: string[]) => {
        if (cmd === "claude" && args[0] === "--version") return "1.0.0";
        return "audit output";
      });
    vi.spyOn(console, "log").mockImplementation(() => {});

    await runAudit(config, ["CLAUDE.md"]);

    // Find the call that invoked claude --print
    const printCall = runSpy.mock.calls.find(
      (call) => call[0] === "claude" && call[1][0] === "--print"
    );
    expect(printCall).toBeDefined();
    expect(printCall![1][1]).toContain("CLAUDE.md");
    expect(printCall![2]).toBe(tmpDir);
  });
});
