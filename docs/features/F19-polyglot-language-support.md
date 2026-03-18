# F19: Polyglot Language Support Architecture

## TLDR

Introduce a language/toolchain detection layer so generated hooks, rules, and docs use the correct commands for Python, Go, and Rust projects — not just Node.js/TypeScript. Start with detection and abstraction; add full language support incrementally.

## Description

The tool currently generates Node.js-specific content everywhere: `npm run lint`, `npm test`, `vitest`, `eslint`, `prettier`, `tsc --noEmit`. This makes the tool unusable for Python, Go, or Rust projects — which are common in AI/ML development.

### Phase 1: Language Detection (This Feature)

Detect the primary language/toolchain of the target project:

```typescript
type Language = "node" | "python" | "go" | "rust" | "unknown";

interface ToolChain {
  language: Language;
  pm: PackageManager; // npm/pnpm/yarn/bun for node; pip/uv/poetry for python; etc.
  format: string; // "prettier" | "black" | "gofmt" | "rustfmt"
  lint: string; // "eslint" | "ruff" | "golangci-lint" | "clippy"
  typecheck: string; // "tsc --noEmit" | "mypy" | "" | ""
  build: string; // "tsc" | "python -m build" | "go build" | "cargo build"
  test: string; // "vitest" | "pytest" | "go test" | "cargo test"
}
```

Detection heuristics:

- `package.json` or `tsconfig.json` → Node/TypeScript
- `pyproject.toml` or `requirements.txt` or `setup.py` → Python
- `go.mod` → Go
- `Cargo.toml` → Rust
- Multiple present → ask user which is primary

### Phase 2: Template Variants

Instead of one set of templates, use language-aware variants:

```
templates/
├── hooks/
│   ├── pre-commit.node.sh     # npm run format, eslint, tsc, vitest
│   ├── pre-commit.python.sh   # black, ruff, mypy, pytest
│   ├── pre-commit.go.sh       # gofmt, golangci-lint, go build, go test
│   └── pre-commit.rust.sh     # rustfmt, clippy, cargo build, cargo test
├── rules/
│   ├── testing.node.md        # Vitest, integration-first, demo tests
│   ├── testing.python.md      # pytest, fixtures, parametrize
│   ├── testing.go.md          # table-driven tests, testify
│   └── testing.rust.md        # #[test], proptest
```

### Phase 3: Language-Specific MCP Servers (Future)

Each language ecosystem may have its own MCP servers:

- Python: `python-lsp-mcp`, `jupyter-mcp`
- Go: `gopls-mcp`
- Rust: `rust-analyzer-mcp`

The registry can be extended per-language.

### Wizard Integration

```
? Detected project language: Python (pyproject.toml found)
  Is this correct? (Y/n)

? Python package manager:
  ❯ uv (recommended)    Fast, modern Python package manager
    pip                  Standard pip
    poetry               Dependency management with lock files
```

## Value

- **Massive market expansion** — AI-assisted development is huge in Python (ML/AI), Go (cloud), Rust (systems)
- **Correct generated content** — no more `npm test` in a Python project
- **Foundation for growth** — toolchain abstraction is the #1 architectural prerequisite for language support
- **Incremental delivery** — Node works today; Python/Go/Rust can ship as follow-up releases

## Changes Required

| File                          | Change                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `src/types.ts`                | Add `Language`, `ToolChain` types; add `toolchain: ToolChain` to `ProjectConfig` |
| `src/utils.ts`                | Add `detectLanguage(projectRoot): Language` function                             |
| `src/wizard.ts`               | Add language detection + confirmation step (early in wizard)                     |
| `src/defaults.ts`             | Default to Node.js toolchain                                                     |
| `src/generators/hooks.ts`     | Select template variant based on `config.toolchain.language`                     |
| `src/generators/rules.ts`     | Select rule variant based on language                                            |
| `src/generators/claude-md.ts` | Use `config.toolchain` for quality gate commands                                 |
| `src/generators/docs.ts`      | Use toolchain commands in onboarding/testing docs                                |
| `templates/hooks/`            | Add per-language variants of pre-commit.sh                                       |
| `templates/rules/`            | Add per-language variants of testing.md, general.md                              |
| `src/registry.ts`             | Add optional `languages` field to MCP server entries                             |
| `test/utils.test.ts`          | Test `detectLanguage` with various project fixtures                              |
| `test/generators/*.test.ts`   | Test language-specific output for each generator                                 |
| `README.md`                   | Document supported languages and detection                                       |
