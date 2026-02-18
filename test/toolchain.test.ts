import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { detectLanguage, buildToolChain, isValidLanguage } from "../src/toolchain.js";
import { PACKAGE_MANAGERS } from "../src/pm.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "toolchain-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("detectLanguage", () => {
  it("demo: detects Rust from Cargo.toml", async () => {
    await fs.writeFile(path.join(tmpDir, "Cargo.toml"), "[package]");
    expect(detectLanguage(tmpDir)).toBe("rust");
  });

  it("demo: detects Go from go.mod", async () => {
    await fs.writeFile(path.join(tmpDir, "go.mod"), "module example.com/app");
    expect(detectLanguage(tmpDir)).toBe("go");
  });

  it("demo: detects Python from pyproject.toml", async () => {
    await fs.writeFile(path.join(tmpDir, "pyproject.toml"), "[tool.poetry]");
    expect(detectLanguage(tmpDir)).toBe("python");
  });

  it("demo: detects Python from requirements.txt", async () => {
    await fs.writeFile(path.join(tmpDir, "requirements.txt"), "flask==3.0");
    expect(detectLanguage(tmpDir)).toBe("python");
  });

  it("demo: detects Python from setup.py", async () => {
    await fs.writeFile(path.join(tmpDir, "setup.py"), "from setuptools import setup");
    expect(detectLanguage(tmpDir)).toBe("python");
  });

  it("demo: detects Node from package.json", async () => {
    await fs.writeFile(path.join(tmpDir, "package.json"), "{}");
    expect(detectLanguage(tmpDir)).toBe("node");
  });

  it("demo: detects Node from tsconfig.json", async () => {
    await fs.writeFile(path.join(tmpDir, "tsconfig.json"), "{}");
    expect(detectLanguage(tmpDir)).toBe("node");
  });

  it("demo: returns unknown for empty directory", () => {
    expect(detectLanguage(tmpDir)).toBe("unknown");
  });

  describe("priority order", () => {
    it("demo: Rust takes priority over Node (Cargo.toml + package.json)", async () => {
      await fs.writeFile(path.join(tmpDir, "Cargo.toml"), "[package]");
      await fs.writeFile(path.join(tmpDir, "package.json"), "{}");
      expect(detectLanguage(tmpDir)).toBe("rust");
    });

    it("demo: Go takes priority over Python", async () => {
      await fs.writeFile(path.join(tmpDir, "go.mod"), "module app");
      await fs.writeFile(path.join(tmpDir, "requirements.txt"), "flask");
      expect(detectLanguage(tmpDir)).toBe("go");
    });

    it("demo: Python takes priority over Node", async () => {
      await fs.writeFile(path.join(tmpDir, "pyproject.toml"), "[tool]");
      await fs.writeFile(path.join(tmpDir, "package.json"), "{}");
      expect(detectLanguage(tmpDir)).toBe("python");
    });
  });
});

describe("buildToolChain", () => {
  it("demo: Node.js toolchain uses npm by default", () => {
    const tc = buildToolChain("node");
    expect(tc.language).toBe("node");
    expect(tc.format).toBe("npm run format");
    expect(tc.lint).toBe("npm run lint");
    expect(tc.typecheck).toBe("npm run typecheck");
    expect(tc.build).toBe("npm run build");
    expect(tc.test).toBe("npm test");
  });

  it("demo: Node.js toolchain uses pnpm when specified", () => {
    const tc = buildToolChain("node", PACKAGE_MANAGERS.pnpm);
    expect(tc.format).toBe("pnpm format");
    expect(tc.lint).toBe("pnpm lint");
    expect(tc.test).toBe("pnpm test");
  });

  it("demo: Node.js toolchain uses yarn when specified", () => {
    const tc = buildToolChain("node", PACKAGE_MANAGERS.yarn);
    expect(tc.format).toBe("yarn format");
    expect(tc.test).toBe("yarn test");
  });

  it("demo: Node.js toolchain uses bun when specified", () => {
    const tc = buildToolChain("node", PACKAGE_MANAGERS.bun);
    expect(tc.format).toBe("bun run format");
    expect(tc.test).toBe("bun test");
  });

  it("demo: Python toolchain returns correct commands", () => {
    const tc = buildToolChain("python");
    expect(tc.language).toBe("python");
    expect(tc.format).toBe("black .");
    expect(tc.lint).toBe("ruff check --fix .");
    expect(tc.typecheck).toBe("mypy .");
    expect(tc.build).toBe("python -m build");
    expect(tc.test).toBe("pytest");
  });

  it("demo: Go toolchain returns correct commands", () => {
    const tc = buildToolChain("go");
    expect(tc.language).toBe("go");
    expect(tc.format).toBe("gofmt -w .");
    expect(tc.lint).toBe("golangci-lint run");
    expect(tc.typecheck).toBe("");
    expect(tc.build).toBe("go build ./...");
    expect(tc.test).toBe("go test ./...");
  });

  it("demo: Rust toolchain returns correct commands", () => {
    const tc = buildToolChain("rust");
    expect(tc.language).toBe("rust");
    expect(tc.format).toBe("cargo fmt");
    expect(tc.lint).toBe("cargo clippy");
    expect(tc.typecheck).toBe("");
    expect(tc.build).toBe("cargo build");
    expect(tc.test).toBe("cargo test");
  });

  it("demo: unknown language falls back to Node.js defaults", () => {
    const tc = buildToolChain("unknown");
    expect(tc.language).toBe("node");
    expect(tc.test).toBe("npm test");
  });

  it("Go and Rust have empty typecheck (compile-time type safety)", () => {
    expect(buildToolChain("go").typecheck).toBe("");
    expect(buildToolChain("rust").typecheck).toBe("");
  });
});

describe("isValidLanguage", () => {
  it("returns true for all supported languages", () => {
    expect(isValidLanguage("node")).toBe(true);
    expect(isValidLanguage("python")).toBe(true);
    expect(isValidLanguage("go")).toBe(true);
    expect(isValidLanguage("rust")).toBe(true);
    expect(isValidLanguage("unknown")).toBe(true);
  });

  it("returns false for invalid language strings", () => {
    expect(isValidLanguage("java")).toBe(false);
    expect(isValidLanguage("")).toBe(false);
    expect(isValidLanguage("typescript")).toBe(false);
    expect(isValidLanguage("deno")).toBe(false);
  });
});
