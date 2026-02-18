/**
 * Language detection and toolchain building (F19).
 *
 * detectLanguage() inspects the project root for language-specific marker files.
 * buildToolChain() returns the correct format/lint/typecheck/build/test commands
 * for each supported language. For Node.js projects, commands integrate with the
 * detected package manager.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import type { Language, ToolChain, PackageManager } from "./types.js";
import { PACKAGE_MANAGERS } from "./pm.js";

/**
 * Detect the primary language of a project by checking for marker files.
 *
 * Priority order (most specific first):
 *   1. Cargo.toml → "rust"
 *   2. go.mod → "go"
 *   3. pyproject.toml | requirements.txt | setup.py → "python"
 *   4. package.json | tsconfig.json → "node"
 *   5. Fallback → "unknown"
 */
export function detectLanguage(projectRoot: string): Language {
  const has = (f: string) => existsSync(path.join(projectRoot, f));

  if (has("Cargo.toml")) return "rust";
  if (has("go.mod")) return "go";
  if (has("pyproject.toml") || has("requirements.txt") || has("setup.py")) return "python";
  if (has("package.json") || has("tsconfig.json")) return "node";
  return "unknown";
}

/**
 * Build a ToolChain for the given language.
 *
 * For Node.js, commands use the detected package manager (pm).
 * For other languages, commands are language-native.
 * "unknown" falls back to Node.js defaults.
 */
export function buildToolChain(
  language: Language,
  pm: PackageManager = PACKAGE_MANAGERS.npm
): ToolChain {
  switch (language) {
    case "python":
      return {
        language,
        format: "black .",
        lint: "ruff check --fix .",
        typecheck: "mypy .",
        build: "python -m build",
        test: "pytest",
      };
    case "go":
      return {
        language,
        format: "gofmt -w .",
        lint: "golangci-lint run",
        typecheck: "",
        build: "go build ./...",
        test: "go test ./...",
      };
    case "rust":
      return {
        language,
        format: "cargo fmt",
        lint: "cargo clippy",
        typecheck: "",
        build: "cargo build",
        test: "cargo test",
      };
    case "node":
    default:
      return {
        language: "node",
        format: `${pm.run} format`,
        lint: `${pm.run} lint`,
        typecheck: `${pm.run} typecheck`,
        build: `${pm.run} build`,
        test: pm.test,
      };
  }
}

/** Validate that a string is a valid Language. */
export function isValidLanguage(value: string): value is Language {
  return ["node", "python", "go", "rust", "unknown"].includes(value);
}
