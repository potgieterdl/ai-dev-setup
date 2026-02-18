# ADR-033: Polyglot Language Support Architecture (F19)

## Status

Accepted

## Context

The ai-init CLI was Node.js-only — all generated templates, rules, hooks, and docs hardcoded npm/Node.js commands for formatting, linting, type-checking, building, and testing. Projects using Python, Go, or Rust received incorrect toolchain instructions.

Feature F19 of the PRD requires automatic language detection and abstraction of all toolchain commands behind a `ToolChain` interface, so generated output is correct for any supported language ecosystem.

## Decision

### 1. Language & ToolChain Types

A `Language` union type (`"node" | "python" | "go" | "rust" | "unknown"`) and a `ToolChain` interface were added to `src/types.ts`. The `ProjectConfig` gained a `toolchain: ToolChain` field and `PresetConfig` gained an optional `language?: Language` field.

### 2. Detection Strategy (src/toolchain.ts)

`detectLanguage()` inspects the project root for marker files in priority order:

1. `Cargo.toml` → Rust (most specific — unique to Rust ecosystem)
2. `go.mod` → Go
3. `pyproject.toml` / `requirements.txt` / `setup.py` → Python
4. `package.json` / `tsconfig.json` → Node.js
5. Fallback → `"unknown"` (treated as Node.js for command generation)

Priority is ordered from most specific to most common. Rust and Go markers are unambiguous, while a `package.json` could coexist with Go or Rust projects, so it has lowest priority.

### 3. Wizard Integration

A new `stepLanguageDetection()` wizard step runs after package manager detection. It auto-detects the language, offers interactive confirmation/override, and supports:

- `SETUP_AI_LANGUAGE` env var for CI overrides
- Non-interactive mode auto-accepts the detected language
- Interactive mode shows a select prompt with all supported options

### 4. ToolChain Command Mapping

`buildToolChain(language, pm)` returns language-appropriate commands:

| Language | Format        | Lint                 | Typecheck        | Build             | Test            |
| -------- | ------------- | -------------------- | ---------------- | ----------------- | --------------- |
| Node.js  | `{pm} format` | `{pm} lint`          | `{pm} typecheck` | `{pm} build`      | `{pm} test`     |
| Python   | `black .`     | `ruff check --fix .` | `mypy .`         | `python -m build` | `pytest`        |
| Go       | `gofmt -w .`  | `golangci-lint run`  | _(empty)_        | `go build ./...`  | `go test ./...` |
| Rust     | `cargo fmt`   | `cargo clippy`       | _(empty)_        | `cargo build`     | `cargo test`    |

Node.js commands integrate with the detected package manager (F15). Go and Rust have empty `typecheck` since they provide compile-time type safety.

### 5. Template Variables

All templates now use `{{FORMAT_CMD}}`, `{{LINT_CMD}}`, `{{TYPECHECK_CMD}}`, `{{BUILD_CMD}}`, `{{TEST_CMD}}` placeholders instead of PM-only variables. These are resolved by each generator using the `config.toolchain` fields.

Affected templates: `rules/general.md`, `rules/testing.md`, `docs/onboarding.md`, `docs/testing_strategy.md`.

### 6. Generator Updates

- **hooks.ts** — Dispatches between `buildNodeStepSnippets()` (PM-aware `--if-present` commands) and `buildToolChainStepSnippets()` (direct language-native commands) based on `config.toolchain.language`.
- **rules.ts** — Passes toolchain variables and a human-readable language label to `fillTemplate()`.
- **claude-md.ts** — `buildQualityGate()` uses toolchain commands and skips empty steps (e.g., typecheck for Go/Rust).
- **docs.ts** — Passes toolchain command variables for onboarding and testing strategy docs.

### 7. Update Command & Presets

- `src/update.ts` `savedToProjectConfig()` now derives `toolchain` via `detectLanguage()` at the project root.
- `src/presets.ts` `applyPreset()` restores toolchain from a preset's `language` field. `extractPresetConfig()` persists the language.

## Consequences

- All generated output (CLAUDE.md, pre-commit hooks, rules, docs, testing strategy) correctly reflects the project's primary language.
- New languages can be added by extending the `Language` union and adding a case to `buildToolChain()`.
- The `"unknown"` fallback ensures graceful degradation to Node.js defaults for unrecognized projects.
- Go and Rust skip the typecheck step in quality gates since their compilers enforce type safety.
