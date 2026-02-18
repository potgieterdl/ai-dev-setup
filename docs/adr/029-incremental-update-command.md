# ADR-029: Incremental Update Command (F16)

- **Status:** Accepted
- **Feature:** F16 — `ai-init update` Incremental Re-configuration
- **Date:** 2026-02-18

## Context

After the initial `ai-init` wizard run, projects evolve — users add databases, switch task trackers, enable agent teams, or add MCP servers they skipped initially. Previously, the only option was to re-run the full wizard (risking overwrites) or manually edit generated files.

F16 introduces an `ai-init update` subcommand for non-destructive, incremental re-configuration.

## Decision

### 1. Config Persistence via `.ai-init.json`

Wizard choices are persisted to `.ai-init.json` in the project root after every initial run and every update. This file:

- Uses a `SavedConfig` interface that captures all wizard choices (MCPs, tracker, rules, hooks, skills, PM, agent teams)
- Is committed to git (enables team alignment)
- Serves as the diff baseline for the `update` command

### 2. Diff-Based Selective Regeneration

The `computeChangedCategories()` function compares previous and new `SavedConfig` states, returning a set of changed categories (`mcp`, `tracker`, `rules`, `hooks`, `skills`, `teams`, `pm`). Only affected files are backed up and regenerated.

### 3. Dual-Mode Update (CLI Flags + Interactive Dashboard)

- **Non-interactive:** CLI flags like `--add-mcp=context7`, `--remove-mcp=beads`, `--tracker=beads`, `--add-rule=api`, `--enable-teams`, `--pm=pnpm`
- **Interactive:** Dashboard showing current config with select-based change menu

### 4. Backup Before Destructive Changes

Before overwriting files, affected paths are copied to `.ai-init-backup/<timestamp>/`. The backup directory is gitignored (machine-local noise).

### 5. Generators Unchanged

All generators remain pure functions (`config → FileDescriptor[]`). The update command reuses `runPostCreate()` with the updated config — no generator modifications needed.

## Consequences

- **Non-destructive evolution:** Projects can add/remove MCPs, switch trackers, toggle agent teams without losing manual customizations in unaffected files
- **Config as documentation:** `.ai-init.json` records what was configured, enabling team-wide consistency
- **Backup safety net:** Destructive changes (MCP removal, tracker switch) create time-stamped backups
- **Architecture and PRD changes still require full wizard:** Only MCP, tracker, rules, hooks, skills, teams, and PM changes are handled incrementally
