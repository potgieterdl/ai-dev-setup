import { runWizard } from "../src/wizard.js";

/**
 * Helper to run the wizard in non-interactive mode with specific env overrides.
 * Saves and restores original env to prevent test pollution.
 */
function withEnv(overrides: Record<string, string | undefined>, fn: () => Promise<void>) {
  return async () => {
    const saved: Record<string, string | undefined> = {};
    // Always enable non-interactive for these tests
    saved.SETUP_AI_NONINTERACTIVE = process.env.SETUP_AI_NONINTERACTIVE;
    process.env.SETUP_AI_NONINTERACTIVE = "1";

    for (const [key, value] of Object.entries(overrides)) {
      saved[key] = process.env[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    try {
      await fn();
    } finally {
      // Restore original env
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      if (saved.SETUP_AI_NONINTERACTIVE === undefined) {
        delete process.env.SETUP_AI_NONINTERACTIVE;
      } else {
        process.env.SETUP_AI_NONINTERACTIVE = saved.SETUP_AI_NONINTERACTIVE;
      }
    }
  };
}

describe("runWizard (non-interactive mode)", () => {
  it(
    "returns valid ProjectConfig with all required fields using defaults",
    withEnv({}, async () => {
      const config = await runWizard("/tmp/test-project");

      expect(config.projectRoot).toBe("/tmp/test-project");
      expect(config.projectName).toBe("test-project");
      expect(config.selectedMcps).toEqual(["taskmaster"]);
      expect(config.taskTracker).toBe("taskmaster");
      expect(config.architecture).toBe("skip");
      expect(config.hasPrd).toBe(false);
      expect(config.generateDocs).toBe(true);
      expect(config.generateRules).toBe(true);
      expect(config.generateSkills).toBe(true);
      expect(config.generateHooks).toBe(true);
      expect(config.generateCommands).toBe(true);
      expect(config.agentTeamsEnabled).toBe(false);
      expect(config.runAudit).toBe(true);
      expect(config.hasApiDocs).toBe(false);
      expect(config.hasDatabase).toBe(false);
      expect(config.generatedFiles).toEqual([]);
    })
  );

  it(
    "SETUP_AI_MCPS=taskmaster,context7 selects both MCP servers",
    withEnv({ SETUP_AI_MCPS: "taskmaster,context7" }, async () => {
      const config = await runWizard("/tmp/test-project");
      expect(config.selectedMcps).toContain("taskmaster");
      expect(config.selectedMcps).toContain("context7");
      expect(config.selectedMcps).toHaveLength(2);
    })
  );

  it(
    "SETUP_AI_MCPS with spaces trims server names",
    withEnv({ SETUP_AI_MCPS: "taskmaster , context7 , beads" }, async () => {
      const config = await runWizard("/tmp/test-project");
      expect(config.selectedMcps).toEqual(["taskmaster", "context7", "beads"]);
    })
  );

  it(
    "SETUP_AI_TRACKER=beads sets taskTracker to beads",
    withEnv({ SETUP_AI_TRACKER: "beads" }, async () => {
      const config = await runWizard("/tmp/test-project");
      expect(config.taskTracker).toBe("beads");
    })
  );

  it(
    "SETUP_AI_TRACKER=markdown sets taskTracker to markdown",
    withEnv({ SETUP_AI_TRACKER: "markdown" }, async () => {
      const config = await runWizard("/tmp/test-project");
      expect(config.taskTracker).toBe("markdown");
    })
  );

  it(
    "SETUP_AI_ARCH=3-tier sets architecture and derives hasDatabase",
    withEnv({ SETUP_AI_ARCH: "3-tier" }, async () => {
      const config = await runWizard("/tmp/test-project");
      expect(config.architecture).toBe("3-tier");
      expect(config.hasDatabase).toBe(true);
      expect(config.hasApiDocs).toBe(true);
    })
  );

  it(
    "SETUP_AI_ARCH=monolith sets hasApiDocs to false",
    withEnv({ SETUP_AI_ARCH: "monolith" }, async () => {
      const config = await runWizard("/tmp/test-project");
      expect(config.architecture).toBe("monolith");
      expect(config.hasApiDocs).toBe(false);
    })
  );

  it(
    "SETUP_AI_SKIP_AUDIT=1 sets runAudit to false",
    withEnv({ SETUP_AI_SKIP_AUDIT: "1" }, async () => {
      const config = await runWizard("/tmp/test-project");
      expect(config.runAudit).toBe(false);
    })
  );

  it(
    "SETUP_AI_AGENT_TEAMS=1 enables agent teams",
    withEnv({ SETUP_AI_AGENT_TEAMS: "1" }, async () => {
      const config = await runWizard("/tmp/test-project");
      expect(config.agentTeamsEnabled).toBe(true);
    })
  );

  it(
    "SETUP_AI_PRD_PATH sets hasPrd and prdPath",
    withEnv({ SETUP_AI_PRD_PATH: "docs/my-prd.md" }, async () => {
      const config = await runWizard("/tmp/test-project");
      expect(config.hasPrd).toBe(true);
      expect(config.prdPath).toBe("docs/my-prd.md");
    })
  );

  it(
    "all env vars combined produce correct config",
    withEnv(
      {
        SETUP_AI_MCPS: "beads,context7",
        SETUP_AI_TRACKER: "beads",
        SETUP_AI_ARCH: "microservices",
        SETUP_AI_AGENT_TEAMS: "1",
        SETUP_AI_SKIP_AUDIT: "1",
        SETUP_AI_PRD_PATH: "prd.md",
      },
      async () => {
        const config = await runWizard("/tmp/test-project");
        expect(config.selectedMcps).toEqual(["beads", "context7"]);
        expect(config.taskTracker).toBe("beads");
        expect(config.architecture).toBe("microservices");
        expect(config.agentTeamsEnabled).toBe(true);
        expect(config.runAudit).toBe(false);
        expect(config.hasPrd).toBe(true);
        expect(config.prdPath).toBe("prd.md");
        expect(config.hasApiDocs).toBe(true);
        expect(config.hasDatabase).toBe(false);
      }
    )
  );
});
