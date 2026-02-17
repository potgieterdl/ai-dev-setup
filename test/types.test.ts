import { defaultConfig } from "../src/defaults.js";
import type { FileDescriptor, ProjectConfig } from "../src/types.js";

describe("ProjectConfig types", () => {
  it("FileDescriptor accepts minimal shape", () => {
    const fd: FileDescriptor = { path: "foo.md", content: "bar" };
    expect(fd.path).toBe("foo.md");
    expect(fd.content).toBe("bar");
    expect(fd.executable).toBeUndefined();
  });

  it("FileDescriptor accepts executable flag", () => {
    const fd: FileDescriptor = {
      path: "hook.sh",
      content: "#!/bin/bash",
      executable: true,
    };
    expect(fd.executable).toBe(true);
  });
});

describe("defaultConfig", () => {
  const config = defaultConfig("/tmp/myproject");

  it("derives projectName from projectRoot basename", () => {
    expect(config.projectName).toBe("myproject");
  });

  it("preserves the full projectRoot path", () => {
    expect(config.projectRoot).toBe("/tmp/myproject");
  });

  it("defaults taskTracker to taskmaster", () => {
    expect(config.taskTracker).toBe("taskmaster");
  });

  it("defaults architecture to skip", () => {
    expect(config.architecture).toBe("skip");
  });

  it("defaults hasPrd to false", () => {
    expect(config.hasPrd).toBe(false);
  });

  it("defaults prdPath to undefined", () => {
    expect(config.prdPath).toBeUndefined();
  });

  it("enables all generation flags by default", () => {
    expect(config.generateDocs).toBe(true);
    expect(config.generateRules).toBe(true);
    expect(config.generateSkills).toBe(true);
    expect(config.generateHooks).toBe(true);
    expect(config.generateCommands).toBe(true);
  });

  it("disables agent teams by default", () => {
    expect(config.agentTeamsEnabled).toBe(false);
  });

  it("enables audit by default", () => {
    expect(config.runAudit).toBe(true);
  });

  it("defaults derived flags to false", () => {
    expect(config.hasApiDocs).toBe(false);
    expect(config.hasDatabase).toBe(false);
  });

  it("starts with an empty generatedFiles array", () => {
    expect(config.generatedFiles).toEqual([]);
  });

  it("defaults selectedMcps to taskmaster only", () => {
    expect(config.selectedMcps).toEqual(["taskmaster"]);
  });

  it("returns a new object each call (no shared state)", () => {
    const a = defaultConfig("/tmp/a");
    const b = defaultConfig("/tmp/b");
    expect(a).not.toBe(b);
    expect(a.projectName).toBe("a");
    expect(b.projectName).toBe("b");
  });

  it("satisfies the ProjectConfig type", () => {
    // TypeScript compile-time check — if defaultConfig doesn't return
    // a valid ProjectConfig, the assignment below would fail to compile.
    const typed: ProjectConfig = defaultConfig("/tmp/check");
    expect(typed).toBeDefined();
  });
});
