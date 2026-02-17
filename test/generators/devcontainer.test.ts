import { describe, it, expect } from "vitest";
import { generateDevcontainer } from "../../src/generators/devcontainer.js";
import { defaultConfig } from "../../src/defaults.js";

function makeConfig(overrides: Partial<ReturnType<typeof defaultConfig>> = {}) {
  return { ...defaultConfig("/tmp/test-project"), ...overrides };
}

describe("generateDevcontainer", () => {
  it("returns exactly 1 FileDescriptor", () => {
    const result = generateDevcontainer(makeConfig());
    expect(result).toHaveLength(1);
  });

  it("returns .devcontainer/devcontainer.json as the path", () => {
    const result = generateDevcontainer(makeConfig());
    expect(result[0].path).toBe(".devcontainer/devcontainer.json");
  });

  it("produces valid JSON", () => {
    const result = generateDevcontainer(makeConfig());
    expect(() => JSON.parse(result[0].content)).not.toThrow();
  });

  describe("project metadata", () => {
    it("uses config.projectName as the name field", () => {
      const result = generateDevcontainer(makeConfig({ projectName: "my-cool-project" }));
      const parsed = JSON.parse(result[0].content);
      expect(parsed.name).toBe("my-cool-project");
    });

    it("defaults projectName from directory basename", () => {
      const result = generateDevcontainer(makeConfig());
      const parsed = JSON.parse(result[0].content);
      expect(parsed.name).toBe("test-project");
    });
  });

  describe("container image and features", () => {
    it("uses the universal devcontainer image", () => {
      const result = generateDevcontainer(makeConfig());
      const parsed = JSON.parse(result[0].content);
      expect(parsed.image).toBe("mcr.microsoft.com/devcontainers/universal:2");
    });

    it("includes Node.js 20 feature", () => {
      const result = generateDevcontainer(makeConfig());
      const parsed = JSON.parse(result[0].content);
      expect(parsed.features).toHaveProperty("ghcr.io/devcontainers/features/node:1");
      expect(parsed.features["ghcr.io/devcontainers/features/node:1"].version).toBe("20");
    });
  });

  describe("lifecycle commands", () => {
    it("sets onCreateCommand to ai-init on-create", () => {
      const result = generateDevcontainer(makeConfig());
      const parsed = JSON.parse(result[0].content);
      expect(parsed.onCreateCommand).toBe("ai-init on-create");
    });

    it("sets postCreateCommand to ai-init post-create", () => {
      const result = generateDevcontainer(makeConfig());
      const parsed = JSON.parse(result[0].content);
      expect(parsed.postCreateCommand).toBe("ai-init post-create");
    });

    it("sets postStartCommand to ai-init post-start", () => {
      const result = generateDevcontainer(makeConfig());
      const parsed = JSON.parse(result[0].content);
      expect(parsed.postStartCommand).toBe("ai-init post-start");
    });
  });

  describe("VS Code customizations", () => {
    it("includes GitHub Copilot extensions", () => {
      const result = generateDevcontainer(makeConfig());
      const parsed = JSON.parse(result[0].content);
      expect(parsed.customizations.vscode.extensions).toContain("GitHub.copilot");
      expect(parsed.customizations.vscode.extensions).toContain("GitHub.copilot-chat");
    });
  });

  describe("secrets and environment", () => {
    it("always includes ANTHROPIC_API_KEY secret", () => {
      const result = generateDevcontainer(makeConfig({ selectedMcps: [] }));
      const parsed = JSON.parse(result[0].content);
      expect(parsed.secrets).toHaveProperty("ANTHROPIC_API_KEY");
      expect(parsed.secrets.ANTHROPIC_API_KEY.description).toContain("Anthropic");
    });

    it("always includes ANTHROPIC_API_KEY in containerEnv", () => {
      const result = generateDevcontainer(makeConfig({ selectedMcps: [] }));
      const parsed = JSON.parse(result[0].content);
      expect(parsed.containerEnv.ANTHROPIC_API_KEY).toBe("${localEnv:ANTHROPIC_API_KEY}");
    });

    it("always includes ANTHROPIC_API_KEY in remoteEnv", () => {
      const result = generateDevcontainer(makeConfig({ selectedMcps: [] }));
      const parsed = JSON.parse(result[0].content);
      expect(parsed.remoteEnv.ANTHROPIC_API_KEY).toBe("${localEnv:ANTHROPIC_API_KEY}");
    });

    it("adds PERPLEXITY_API_KEY secret when taskmaster is selected", () => {
      const result = generateDevcontainer(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[0].content);
      expect(parsed.secrets).toHaveProperty("PERPLEXITY_API_KEY");
      expect(parsed.containerEnv).toHaveProperty("PERPLEXITY_API_KEY");
      expect(parsed.remoteEnv).toHaveProperty("PERPLEXITY_API_KEY");
    });

    it("does NOT duplicate ANTHROPIC_API_KEY from taskmaster env", () => {
      const result = generateDevcontainer(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[0].content);
      // ANTHROPIC_API_KEY appears exactly once (from the always-included base)
      const secretKeys = Object.keys(parsed.secrets).filter(
        (k: string) => k === "ANTHROPIC_API_KEY"
      );
      expect(secretKeys).toHaveLength(1);
    });

    it("does not add non-secret env vars like TASK_MASTER_TOOLS", () => {
      const result = generateDevcontainer(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[0].content);
      expect(parsed.secrets).not.toHaveProperty("TASK_MASTER_TOOLS");
      expect(parsed.containerEnv).not.toHaveProperty("TASK_MASTER_TOOLS");
    });

    it("handles servers with no env vars (e.g., context7)", () => {
      const result = generateDevcontainer(makeConfig({ selectedMcps: ["context7"] }));
      const parsed = JSON.parse(result[0].content);
      // Only ANTHROPIC_API_KEY from the base
      expect(Object.keys(parsed.secrets)).toEqual(["ANTHROPIC_API_KEY"]);
    });

    it("uses ${localEnv:VAR} syntax for env forwarding", () => {
      const result = generateDevcontainer(makeConfig({ selectedMcps: ["taskmaster"] }));
      const parsed = JSON.parse(result[0].content);
      expect(parsed.containerEnv.PERPLEXITY_API_KEY).toBe("${localEnv:PERPLEXITY_API_KEY}");
      expect(parsed.remoteEnv.PERPLEXITY_API_KEY).toBe("${localEnv:PERPLEXITY_API_KEY}");
    });
  });

  describe("does not mark file as executable", () => {
    it("has no executable flag set", () => {
      const result = generateDevcontainer(makeConfig());
      expect(result[0].executable).toBeUndefined();
    });
  });
});
