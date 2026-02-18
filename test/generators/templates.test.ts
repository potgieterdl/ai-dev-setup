import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { fillTemplate } from "../../src/utils.js";

const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/docs");
const RULES_DIR = path.resolve(__dirname, "../../templates/rules");
const SKILLS_DIR = path.resolve(__dirname, "../../templates/skills");
const HOOKS_DIR = path.resolve(__dirname, "../../templates/hooks");
const COMMANDS_DIR = path.resolve(__dirname, "../../templates/commands");

const EXPECTED_TEMPLATES = [
  "doc_format.md",
  "prd.md",
  "architecture.md",
  "api.md",
  "cuj.md",
  "testing_strategy.md",
  "onboarding.md",
  "adr_template.md",
  "tasks_simple.md",
];

describe("document templates", () => {
  describe("all template files exist", () => {
    for (const file of EXPECTED_TEMPLATES) {
      it(`templates/docs/${file} exists`, async () => {
        const filePath = path.join(TEMPLATES_DIR, file);
        await expect(fs.access(filePath)).resolves.toBeUndefined();
      });
    }
  });

  describe("no template exceeds 500 lines", () => {
    for (const file of EXPECTED_TEMPLATES) {
      it(`${file} is under 500 lines`, async () => {
        const content = await fs.readFile(path.join(TEMPLATES_DIR, file), "utf8");
        const lineCount = content.split("\n").length;
        expect(lineCount).toBeLessThanOrEqual(500);
      });
    }
  });

  describe("templates follow doc_format.md standard", () => {
    for (const file of EXPECTED_TEMPLATES) {
      if (file === "doc_format.md" || file === "adr_template.md" || file === "tasks_simple.md")
        continue;

      it(`${file} starts with a heading`, async () => {
        const content = await fs.readFile(path.join(TEMPLATES_DIR, file), "utf8");
        expect(content.startsWith("# ")).toBe(true);
      });

      it(`${file} has a TLDR section`, async () => {
        const content = await fs.readFile(path.join(TEMPLATES_DIR, file), "utf8");
        expect(content).toMatch(/TLDR/i);
      });

      it(`${file} has a Table of Contents`, async () => {
        const content = await fs.readFile(path.join(TEMPLATES_DIR, file), "utf8");
        expect(content).toMatch(/Table of Contents/i);
      });
    }
  });

  describe("placeholder substitution", () => {
    it("architecture.md replaces {{PROJECT_NAME}} and {{ARCHITECTURE}}", async () => {
      const template = await fs.readFile(path.join(TEMPLATES_DIR, "architecture.md"), "utf8");
      const result = fillTemplate(template, {
        PROJECT_NAME: "MyApp",
        ARCHITECTURE: "3-tier",
      });
      expect(result).toContain("MyApp");
      expect(result).toContain("3-tier");
      expect(result).not.toContain("{{PROJECT_NAME}}");
      expect(result).not.toContain("{{ARCHITECTURE}}");
    });

    it("prd.md replaces {{PROJECT_NAME}}", async () => {
      const template = await fs.readFile(path.join(TEMPLATES_DIR, "prd.md"), "utf8");
      const result = fillTemplate(template, { PROJECT_NAME: "TestProject" });
      expect(result).toContain("TestProject");
      expect(result).not.toContain("{{PROJECT_NAME}}");
    });

    it("adr_template.md replaces {{NUMBER}} and {{TITLE}}", async () => {
      const template = await fs.readFile(path.join(TEMPLATES_DIR, "adr_template.md"), "utf8");
      const result = fillTemplate(template, {
        NUMBER: "001",
        TITLE: "Use JWT Auth",
      });
      expect(result).toContain("ADR-001: Use JWT Auth");
      expect(result).not.toContain("{{NUMBER}}");
      expect(result).not.toContain("{{TITLE}}");
    });
  });

  describe("prd.md contains demo test field", () => {
    it("has Demo test placeholder in feature template", async () => {
      const content = await fs.readFile(path.join(TEMPLATES_DIR, "prd.md"), "utf8");
      expect(content).toContain("Demo test");
    });
  });

  describe("tasks_simple.md has required fields", () => {
    it("has Demo command field", async () => {
      const content = await fs.readFile(path.join(TEMPLATES_DIR, "tasks_simple.md"), "utf8");
      expect(content).toContain("Demo command");
    });

    it("has Status field", async () => {
      const content = await fs.readFile(path.join(TEMPLATES_DIR, "tasks_simple.md"), "utf8");
      expect(content).toContain("Status");
    });

    it("has Depends on field", async () => {
      const content = await fs.readFile(path.join(TEMPLATES_DIR, "tasks_simple.md"), "utf8");
      expect(content).toContain("Depends on");
    });
  });
});

/* ──────────────────────────────────────────────────────────
 * Rules template tests (F3)
 * ────────────────────────────────────────────────────────── */

const EXPECTED_RULES = [
  "general.md",
  "docs.md",
  "testing.md",
  "git.md",
  "security.md",
  "api.md",
  "database.md",
  "config.md",
  "agent-teams.md",
];

describe("rules templates", () => {
  describe("all rules template files exist", () => {
    for (const file of EXPECTED_RULES) {
      it(`templates/rules/${file} exists`, async () => {
        await expect(fs.access(path.join(RULES_DIR, file))).resolves.toBeUndefined();
      });
    }
  });

  describe("no rules template exceeds 500 lines", () => {
    for (const file of EXPECTED_RULES) {
      it(`${file} is under 500 lines`, async () => {
        const content = await fs.readFile(path.join(RULES_DIR, file), "utf8");
        const lineCount = content.split("\n").length;
        expect(lineCount).toBeLessThanOrEqual(500);
      });
    }
  });

  describe("all rules have YAML frontmatter with paths or description", () => {
    for (const file of EXPECTED_RULES) {
      it(`${file} has YAML frontmatter`, async () => {
        const content = await fs.readFile(path.join(RULES_DIR, file), "utf8");
        expect(content).toMatch(/^---\n/);
        expect(content).toMatch(/\n---\n/);
      });

      it(`${file} has a description field`, async () => {
        const content = await fs.readFile(path.join(RULES_DIR, file), "utf8");
        expect(content).toMatch(/description:/);
      });
    }
  });

  describe("testing.md rule content", () => {
    it("contains 'Integration tests' section", async () => {
      const content = await fs.readFile(path.join(RULES_DIR, "testing.md"), "utf8");
      expect(content).toMatch(/Integration [Tt]ests/);
    });

    it("contains 'Demo checkpoints' section", async () => {
      const content = await fs.readFile(path.join(RULES_DIR, "testing.md"), "utf8");
      expect(content).toMatch(/Demo [Cc]heckpoints/i);
    });

    it("contains 'Quality gate' section", async () => {
      const content = await fs.readFile(path.join(RULES_DIR, "testing.md"), "utf8");
      expect(content).toMatch(/Quality [Gg]ate/i);
    });
  });

  describe("git.md rule content", () => {
    it("contains branch naming pattern feat/<task-id>", async () => {
      const content = await fs.readFile(path.join(RULES_DIR, "git.md"), "utf8");
      expect(content).toContain("feat/<task-id>");
    });

    it("contains commit message format", async () => {
      const content = await fs.readFile(path.join(RULES_DIR, "git.md"), "utf8");
      expect(content).toContain("<task-id>:");
    });
  });

  describe("security.md rule content", () => {
    it("contains OWASP reference", async () => {
      const content = await fs.readFile(path.join(RULES_DIR, "security.md"), "utf8");
      expect(content).toMatch(/OWASP/i);
    });

    it("has paths scoped to auth and middleware", async () => {
      const content = await fs.readFile(path.join(RULES_DIR, "security.md"), "utf8");
      expect(content).toContain("src/auth/**");
      expect(content).toContain("src/middleware/**");
    });
  });

  describe("general.md rule content", () => {
    it("contains {{LANGUAGE}} placeholder", async () => {
      const content = await fs.readFile(path.join(RULES_DIR, "general.md"), "utf8");
      expect(content).toContain("{{LANGUAGE}}");
    });
  });

  describe("api.md rule content", () => {
    it("references @docs/api.md", async () => {
      const content = await fs.readFile(path.join(RULES_DIR, "api.md"), "utf8");
      expect(content).toContain("@docs/api.md");
    });

    it("has API_PATHS placeholder for dynamic path scoping (F20)", async () => {
      const content = await fs.readFile(path.join(RULES_DIR, "api.md"), "utf8");
      expect(content).toContain("{{API_PATHS}}");
    });
  });
});

/* ──────────────────────────────────────────────────────────
 * Skills template tests (F3)
 * ────────────────────────────────────────────────────────── */

const EXPECTED_SKILLS = ["testing.md", "commit.md", "task-workflow.md"];

describe("skills templates", () => {
  describe("all skills template files exist", () => {
    for (const file of EXPECTED_SKILLS) {
      it(`templates/skills/${file} exists`, async () => {
        await expect(fs.access(path.join(SKILLS_DIR, file))).resolves.toBeUndefined();
      });
    }
  });

  describe("all skills have YAML frontmatter with description", () => {
    for (const file of EXPECTED_SKILLS) {
      it(`${file} has YAML frontmatter with description`, async () => {
        const content = await fs.readFile(path.join(SKILLS_DIR, file), "utf8");
        expect(content).toMatch(/^---\n/);
        expect(content).toMatch(/description:/);
      });
    }
  });

  describe("testing.md skill content", () => {
    it("covers integration-first philosophy", async () => {
      const content = await fs.readFile(path.join(SKILLS_DIR, "testing.md"), "utf8");
      expect(content).toMatch(/[Ii]ntegration/);
    });

    it("mentions demo test pattern", async () => {
      const content = await fs.readFile(path.join(SKILLS_DIR, "testing.md"), "utf8");
      expect(content).toMatch(/demo/i);
    });
  });

  describe("commit.md skill content", () => {
    it("includes the quality gate steps", async () => {
      const content = await fs.readFile(path.join(SKILLS_DIR, "commit.md"), "utf8");
      expect(content).toContain("Format");
      expect(content).toContain("Lint");
      expect(content).toContain("Type-check");
      expect(content).toContain("Build");
      expect(content).toContain("Test");
    });
  });

  describe("task-workflow.md skill content", () => {
    it("covers picking, implementing, and completing a task", async () => {
      const content = await fs.readFile(path.join(SKILLS_DIR, "task-workflow.md"), "utf8");
      expect(content).toMatch(/Picking a Task/i);
      expect(content).toMatch(/Implementing a Task/i);
      expect(content).toMatch(/Completing a Task/i);
    });
  });
});

/* ──────────────────────────────────────────────────────────
 * Hooks template tests (F3)
 * ────────────────────────────────────────────────────────── */

describe("hooks templates", () => {
  it("templates/hooks/pre-commit.sh exists", async () => {
    await expect(fs.access(path.join(HOOKS_DIR, "pre-commit.sh"))).resolves.toBeUndefined();
  });

  it("pre-commit.sh contains --if-present flag", async () => {
    const content = await fs.readFile(path.join(HOOKS_DIR, "pre-commit.sh"), "utf8");
    expect(content).toContain("--if-present");
  });

  it("pre-commit.sh uses set -euo pipefail", async () => {
    const content = await fs.readFile(path.join(HOOKS_DIR, "pre-commit.sh"), "utf8");
    expect(content).toContain("set -euo pipefail");
  });

  it("pre-commit.sh has correct exit codes on failure", async () => {
    const content = await fs.readFile(path.join(HOOKS_DIR, "pre-commit.sh"), "utf8");
    expect(content).toContain("exit 1");
  });

  it("pre-commit.sh starts with shebang", async () => {
    const content = await fs.readFile(path.join(HOOKS_DIR, "pre-commit.sh"), "utf8");
    expect(content.startsWith("#!/usr/bin/env bash")).toBe(true);
  });

  it("pre-commit.sh has PM placeholders for format, lint, typecheck, build, and test", async () => {
    const content = await fs.readFile(path.join(HOOKS_DIR, "pre-commit.sh"), "utf8");
    expect(content).toContain("{{PM_RUN_IF_PRESENT}} format");
    expect(content).toContain("{{PM_RUN_IF_PRESENT}} lint");
    expect(content).toContain("{{PM_RUN_IF_PRESENT}} typecheck");
    expect(content).toContain("{{PM_RUN_IF_PRESENT}} build");
    expect(content).toContain("{{PM_TEST}}");
  });
});

/* ──────────────────────────────────────────────────────────
 * Commands template tests (F8)
 * ────────────────────────────────────────────────────────── */

const EXPECTED_COMMANDS = ["dev-next.md", "review.md"];

describe("commands templates", () => {
  describe("all commands template files exist", () => {
    for (const file of EXPECTED_COMMANDS) {
      it(`templates/commands/${file} exists`, async () => {
        await expect(fs.access(path.join(COMMANDS_DIR, file))).resolves.toBeUndefined();
      });
    }
  });

  describe("dev-next.md command content", () => {
    it("references docs/prd.md", async () => {
      const content = await fs.readFile(path.join(COMMANDS_DIR, "dev-next.md"), "utf8");
      expect(content).toContain("docs/prd.md");
    });

    it("references docs/adr/", async () => {
      const content = await fs.readFile(path.join(COMMANDS_DIR, "dev-next.md"), "utf8");
      expect(content).toContain("docs/adr/");
    });

    it("includes commit format reference", async () => {
      const content = await fs.readFile(path.join(COMMANDS_DIR, "dev-next.md"), "utf8");
      expect(content).toContain("<task-id>");
    });
  });

  describe("review.md command content", () => {
    it("includes git diff step", async () => {
      const content = await fs.readFile(path.join(COMMANDS_DIR, "review.md"), "utf8");
      expect(content).toContain("git diff");
    });

    it("includes quality gate reference", async () => {
      const content = await fs.readFile(path.join(COMMANDS_DIR, "review.md"), "utf8");
      expect(content).toMatch(/quality gate/i);
    });
  });
});

/* boot-prompt template tests removed — F12: boot-prompt.txt was deleted.
 * CLAUDE.md now provides all session context. See docs/adr/026-remove-boot-prompt.md */
