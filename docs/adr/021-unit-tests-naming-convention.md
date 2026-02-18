# ADR-021: Unit Tests for All Generators with smoke:/demo: Naming Convention

- **Status:** Accepted
- **Date:** 2026-02-17
- **Task:** 21

## Context

The project's testing strategy (F9) requires all tests to follow a `smoke:` / `demo:` naming convention to clearly categorize test intent:

- **`smoke:`** — basic structural/wiring tests (file count, valid JSON, correct output paths, non-empty content)
- **`demo:`** — feature-demonstrating tests that verify real behavior end-to-end (tracker-specific content, conditional generation based on config flags, placeholder substitution, content validation)

Comprehensive unit tests for all 7 generator modules already existed (mcp-json, claude-md, docs, rules, skills, hooks, devcontainer, commands) with 135+ tests across the generator test files. However, none followed the required naming convention, making it difficult to quickly identify whether a test is a structural check or a feature demonstration.

## Decision

Update all existing generator test files to prefix every `it()` block with either `smoke:` or `demo:` based on the test's purpose:

1. **smoke:** tests validate structural correctness — file counts, output paths, valid JSON parsing, non-empty content, correct file extensions
2. **demo:** tests validate functional behavior — tracker-specific command references, conditional file generation based on `ProjectConfig` flags, template placeholder substitution, content quality checks

No test logic was changed — only the `it()` description strings were updated. The total test count remains at 392 (135 in generator tests, all using the naming convention).

## Consequences

- Test output now clearly distinguishes structural checks (`smoke:`) from feature demonstrations (`demo:`)
- The naming convention dogfoods the project's own testing strategy guidance from F9
- Future tests should follow this convention to maintain consistency
- CI/grep tooling can filter tests by prefix: `vitest --grep "smoke:"` or `vitest --grep "demo:"`
