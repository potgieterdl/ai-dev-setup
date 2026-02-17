# ADR-002: Core Types and ProjectConfig Interface

- **Status:** Accepted
- **Feature:** F1 (TypeScript CLI)
- **Task:** 2 — Define Core Types and ProjectConfig Interface
- **Date:** 2026-02-17

## Context

All generators in the CLI produce files from a shared configuration object. Without a central type definition, each generator would define its own ad-hoc config shapes, leading to inconsistency and duplication. We need a single source of truth for:

1. What user choices the wizard captures (MCP selections, task tracker, architecture, feature flags)
2. What generators receive as input (`ProjectConfig`)
3. What generators return as output (`FileDescriptor`)
4. What the audit step produces (`AuditResult`)

## Decision

- **Central `ProjectConfig` interface** in `src/types.ts` captures every wizard choice. All generators and phases receive this single type.
- **`FileDescriptor`** is the universal generator output: `{ path, content, executable? }`. Generators are pure functions that return `FileDescriptor[]` and never touch the filesystem.
- **`defaultConfig()` factory** in `src/defaults.ts` returns a fully-populated default config. The wizard starts from defaults and overrides per user choices, ensuring no field is accidentally `undefined`.
- **Union types** (`TaskTracker`, `Architecture`) use string literals for exhaustive switch/case checking at compile time.
- **`McpServer` interface** defines the registry schema for MCP server entries, decoupling the registry data from the config that references it by name.

## Consequences

- All generators have a stable, typed contract — adding a new wizard choice means adding a field to `ProjectConfig` and updating `defaultConfig()`.
- The `FileDescriptor` pattern enforces the "pure generator" architecture: generators never do I/O, making them trivially testable.
- The `generatedFiles: string[]` field in `ProjectConfig` enables the F11 audit to scope its review to only files produced during the current run.
- Trade-off: adding a new config field requires touching both `types.ts` and `defaults.ts`, but TypeScript catches any mismatch at compile time.
