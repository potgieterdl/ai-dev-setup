import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { analyzeProject } from "../src/analyze.js";
import * as utils from "../src/utils.js";

describe("analyzeProject", () => {
  let tmpDir: string;

  beforeEach(async () => {
    vi.restoreAllMocks();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "analyze-test-"));
    // Create a minimal project structure so detectProject succeeds
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      '{"dependencies":{"express":"^4"},"devDependencies":{"vitest":"latest"}}'
    );
    await fs.writeFile(path.join(tmpDir, "tsconfig.json"), "{}");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns ProjectAnalysis on valid Haiku response", async () => {
    const validResponse = {
      detectedArchitecture: "3-tier",
      apiPaths: ["src/routes/**"],
      dbPaths: ["prisma/**"],
      testPaths: ["test/**"],
      architectureGuidance: "Express + Prisma + React.",
      recommendedRules: ["general", "api", "database"],
      hookSteps: ["format", "lint", "typecheck"],
    };
    vi.spyOn(utils, "run").mockResolvedValue(JSON.stringify(validResponse));
    const result = await analyzeProject(tmpDir);
    expect(result?.detectedArchitecture).toBe("3-tier");
    expect(result?.apiPaths).toEqual(["src/routes/**"]);
    expect(result?.dbPaths).toEqual(["prisma/**"]);
    expect(result?.recommendedRules).toContain("general");
    expect(result?.hookSteps).toContain("format");
  });

  it("retries once on Zod validation failure, then returns null", async () => {
    const invalidResponse = { detectedArchitecture: "unknown", apiPaths: "not-array" };
    const runSpy = vi
      .spyOn(utils, "run")
      .mockResolvedValueOnce(JSON.stringify(invalidResponse)) // first call fails Zod
      .mockResolvedValueOnce(JSON.stringify(invalidResponse)); // retry also fails
    const result = await analyzeProject(tmpDir);
    expect(result).toBeNull();
    expect(runSpy).toHaveBeenCalledTimes(2);
  });

  it("returns null when claude run() throws (network error)", async () => {
    vi.spyOn(utils, "run").mockRejectedValue(new Error("command not found"));
    const result = await analyzeProject(tmpDir);
    expect(result).toBeNull();
  });

  it("returns null when JSON.parse fails", async () => {
    vi.spyOn(utils, "run").mockResolvedValue("not valid json");
    const result = await analyzeProject(tmpDir);
    expect(result).toBeNull();
  });

  it("returns result on second attempt if first fails validation", async () => {
    const invalidResponse = { detectedArchitecture: "bad" };
    const validResponse = {
      detectedArchitecture: "monolith",
      apiPaths: ["src/api/**"],
      dbPaths: [],
      testPaths: ["test/**"],
      architectureGuidance: "Simple monolith.",
      recommendedRules: ["general", "testing"],
      hookSteps: ["format", "lint", "test"],
    };
    vi.spyOn(utils, "run")
      .mockResolvedValueOnce(JSON.stringify(invalidResponse))
      .mockResolvedValueOnce(JSON.stringify(validResponse));
    const result = await analyzeProject(tmpDir);
    expect(result).not.toBeNull();
    expect(result?.detectedArchitecture).toBe("monolith");
  });

  it("validates architectureGuidance max length", async () => {
    const longGuidance = "a".repeat(501);
    const response = {
      detectedArchitecture: "monolith",
      apiPaths: [],
      dbPaths: [],
      testPaths: [],
      architectureGuidance: longGuidance,
      recommendedRules: ["general"],
      hookSteps: ["test"],
    };
    vi.spyOn(utils, "run").mockResolvedValue(JSON.stringify(response));
    // First call fails, retry also returns same invalid response
    const result = await analyzeProject(tmpDir);
    expect(result).toBeNull();
  });

  it("validates array max items", async () => {
    const response = {
      detectedArchitecture: "monolith",
      apiPaths: Array.from({ length: 11 }, (_, i) => `path${i}/**`),
      dbPaths: [],
      testPaths: [],
      architectureGuidance: "Test.",
      recommendedRules: ["general"],
      hookSteps: ["test"],
    };
    vi.spyOn(utils, "run").mockResolvedValue(JSON.stringify(response));
    const result = await analyzeProject(tmpDir);
    expect(result).toBeNull();
  });

  it("passes claude the right arguments", async () => {
    const validResponse = {
      detectedArchitecture: "monolith",
      apiPaths: [],
      dbPaths: [],
      testPaths: [],
      architectureGuidance: "Simple app.",
      recommendedRules: ["general"],
      hookSteps: ["test"],
    };
    const runSpy = vi.spyOn(utils, "run").mockResolvedValue(JSON.stringify(validResponse));
    await analyzeProject(tmpDir);

    expect(runSpy).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining(["--model", "haiku", "--output-format", "json", "--max-turns", "1"]),
      tmpDir
    );
  });
});
