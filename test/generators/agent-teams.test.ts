import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { configureAgentTeams } from "../../src/generators/agent-teams.js";
import { defaultConfig } from "../../src/defaults.js";
import type { ProjectConfig } from "../../src/types.js";

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return { ...defaultConfig("/tmp/test-project"), ...overrides };
}

describe("configureAgentTeams", () => {
  let tmpDir: string;
  let settingsPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-teams-test-"));
    settingsPath = path.join(tmpDir, ".claude", "settings.json");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("when agentTeamsEnabled is false", () => {
    it("smoke: returns without writing any files", async () => {
      await configureAgentTeams(makeConfig({ agentTeamsEnabled: false }), settingsPath);

      await expect(fs.access(settingsPath)).rejects.toThrow();
    });
  });

  describe("when agentTeamsEnabled is true", () => {
    it("demo: creates settings file with CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS flag", async () => {
      await configureAgentTeams(makeConfig({ agentTeamsEnabled: true }), settingsPath);

      const content = await fs.readFile(settingsPath, "utf8");
      const parsed = JSON.parse(content);
      expect(parsed.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe("1");
    });

    it("demo: creates parent directory if it does not exist", async () => {
      const deepPath = path.join(tmpDir, "nested", "deep", ".claude", "settings.json");
      await configureAgentTeams(makeConfig({ agentTeamsEnabled: true }), deepPath);

      const content = await fs.readFile(deepPath, "utf8");
      const parsed = JSON.parse(content);
      expect(parsed.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe("1");
    });

    it("smoke: written file is valid JSON", async () => {
      await configureAgentTeams(makeConfig({ agentTeamsEnabled: true }), settingsPath);

      const content = await fs.readFile(settingsPath, "utf8");
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe("merge with existing settings", () => {
    it("demo: preserves existing keys when merging", async () => {
      await fs.mkdir(path.dirname(settingsPath), { recursive: true });
      await fs.writeFile(
        settingsPath,
        JSON.stringify({ allowedTools: ["Edit", "Read"], theme: "dark" }, null, 2),
        "utf8"
      );

      await configureAgentTeams(makeConfig({ agentTeamsEnabled: true }), settingsPath);

      const content = await fs.readFile(settingsPath, "utf8");
      const parsed = JSON.parse(content);
      expect(parsed.allowedTools).toEqual(["Edit", "Read"]);
      expect(parsed.theme).toBe("dark");
      expect(parsed.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe("1");
    });

    it("demo: merges into existing env block without overwriting other env vars", async () => {
      await fs.mkdir(path.dirname(settingsPath), { recursive: true });
      await fs.writeFile(
        settingsPath,
        JSON.stringify({ env: { MY_VAR: "keep-me", ANOTHER: "also-keep" } }, null, 2),
        "utf8"
      );

      await configureAgentTeams(makeConfig({ agentTeamsEnabled: true }), settingsPath);

      const content = await fs.readFile(settingsPath, "utf8");
      const parsed = JSON.parse(content);
      expect(parsed.env.MY_VAR).toBe("keep-me");
      expect(parsed.env.ANOTHER).toBe("also-keep");
      expect(parsed.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe("1");
    });

    it("demo: handles corrupted/invalid JSON in existing file gracefully", async () => {
      await fs.mkdir(path.dirname(settingsPath), { recursive: true });
      await fs.writeFile(settingsPath, "this is not json {{{", "utf8");

      await configureAgentTeams(makeConfig({ agentTeamsEnabled: true }), settingsPath);

      const content = await fs.readFile(settingsPath, "utf8");
      const parsed = JSON.parse(content);
      expect(parsed.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe("1");
    });
  });
});
