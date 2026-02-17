import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { fillTemplate } from "../../src/utils.js";

const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/docs");

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
        const content = await fs.readFile(
          path.join(TEMPLATES_DIR, file),
          "utf8",
        );
        const lineCount = content.split("\n").length;
        expect(lineCount).toBeLessThanOrEqual(500);
      });
    }
  });

  describe("templates follow doc_format.md standard", () => {
    for (const file of EXPECTED_TEMPLATES) {
      if (
        file === "doc_format.md" ||
        file === "adr_template.md" ||
        file === "tasks_simple.md"
      )
        continue;

      it(`${file} starts with a heading`, async () => {
        const content = await fs.readFile(
          path.join(TEMPLATES_DIR, file),
          "utf8",
        );
        expect(content.startsWith("# ")).toBe(true);
      });

      it(`${file} has a TLDR section`, async () => {
        const content = await fs.readFile(
          path.join(TEMPLATES_DIR, file),
          "utf8",
        );
        expect(content).toMatch(/TLDR/i);
      });

      it(`${file} has a Table of Contents`, async () => {
        const content = await fs.readFile(
          path.join(TEMPLATES_DIR, file),
          "utf8",
        );
        expect(content).toMatch(/Table of Contents/i);
      });
    }
  });

  describe("placeholder substitution", () => {
    it("architecture.md replaces {{PROJECT_NAME}} and {{ARCHITECTURE}}", async () => {
      const template = await fs.readFile(
        path.join(TEMPLATES_DIR, "architecture.md"),
        "utf8",
      );
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
      const template = await fs.readFile(
        path.join(TEMPLATES_DIR, "prd.md"),
        "utf8",
      );
      const result = fillTemplate(template, { PROJECT_NAME: "TestProject" });
      expect(result).toContain("TestProject");
      expect(result).not.toContain("{{PROJECT_NAME}}");
    });

    it("adr_template.md replaces {{NUMBER}} and {{TITLE}}", async () => {
      const template = await fs.readFile(
        path.join(TEMPLATES_DIR, "adr_template.md"),
        "utf8",
      );
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
      const content = await fs.readFile(
        path.join(TEMPLATES_DIR, "prd.md"),
        "utf8",
      );
      expect(content).toContain("Demo test");
    });
  });

  describe("tasks_simple.md has required fields", () => {
    it("has Demo command field", async () => {
      const content = await fs.readFile(
        path.join(TEMPLATES_DIR, "tasks_simple.md"),
        "utf8",
      );
      expect(content).toContain("Demo command");
    });

    it("has Status field", async () => {
      const content = await fs.readFile(
        path.join(TEMPLATES_DIR, "tasks_simple.md"),
        "utf8",
      );
      expect(content).toContain("Status");
    });

    it("has Depends on field", async () => {
      const content = await fs.readFile(
        path.join(TEMPLATES_DIR, "tasks_simple.md"),
        "utf8",
      );
      expect(content).toContain("Depends on");
    });
  });
});
