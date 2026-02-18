# ADR-019: Integration Test Suite Design

- **Status:** Accepted
- **Feature:** F9 (Testing Strategy Guidance), F1 (TypeScript CLI)
- **Date:** 2026-02-17

## Context

The project needed a comprehensive integration test suite that exercises the CLI end-to-end, validating that `ai-init` produces correct output files across all configurations. Existing tests were unit tests (pure function assertions on generators) and a phase-level integration test (calling `runPostCreate` directly). No tests existed that ran the actual CLI binary in a subprocess — the way a real user would invoke it.

The PRD's testing philosophy (F9) mandates integration-first testing: exercise real code paths, use real file I/O, and avoid mocks. The test suite itself should dogfood this philosophy.

## Decision

Created `test/integration/full-run.test.ts` — a comprehensive integration test suite with 37 tests that:

1. **Runs the compiled CLI binary** (`dist/cli.js`) in a subprocess via `execFile`, just as a real user would via `ai-init`
2. **Uses real temporary directories** (`fs.mkdtemp`) with full cleanup in `afterEach`
3. **Drives all configuration via environment variables** (non-interactive mode) — no mocks, no prompt simulation
4. **Follows the demo-test naming convention**: `smoke:` for basic wiring tests, `demo:` for feature verification tests

### Test coverage organized by concern:

| Area                    | Tests | What's verified                                                    |
| ----------------------- | ----- | ------------------------------------------------------------------ |
| Smoke (non-interactive) | 3     | Core files created, devcontainer generated, clean exit             |
| MCP configuration       | 5     | Valid JSON schemas, correct package names, env vars, all 5 servers |
| Task tracker content    | 4     | Taskmaster/beads/markdown CLAUDE.md instructions, CLAUDE_MCP.md    |
| Document scaffolding    | 6     | All doc templates, ADR directory, API docs conditional logic       |
| Rules/skills/hooks      | 7     | Rule frontmatter, conditional rules, executable hooks, commands    |
| Idempotency             | 3     | Same output across repeated runs                                   |
| CLI lifecycle commands  | 5     | post-create, post-start, welcome banner, task summary              |
| CLAUDE.md quality       | 4     | Quality gate, doc imports, MCP references, rules references        |

### Key design choices:

- **Always set `SETUP_AI_SKIP_AUDIT=1`** to prevent API calls during tests
- **Always set `SETUP_AI_NONINTERACTIVE=1`** to prevent prompt hangs
- **30-second timeout** per CLI invocation to catch hangs
- **Helper functions** (`runCli`, `readFile`, `fileExists`) reduce boilerplate while keeping tests readable

## Consequences

- **Full confidence in CLI behavior** — tests verify the tool works as a user would experience it
- **No false green** — every test reads real files from disk, no mocked generators
- **~15 seconds runtime** — acceptable for 37 integration tests that each spawn a subprocess
- **Depends on build** — tests run against `dist/cli.js`, so `npm run build` must precede `npm test` (which is the standard workflow)
- **Environment variable isolation** — tests override env vars per-invocation, avoiding cross-test contamination
