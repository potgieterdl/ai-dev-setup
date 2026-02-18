# F16: `ai-init update` — Incremental Re-configuration

## TLDR

Add an `ai-init update` command that lets users add, remove, or reconfigure features after initial setup — without re-running the full wizard or overwriting existing customizations.

## Description

Currently `ai-init` is a one-shot tool: run it once, get your files, done. But projects evolve — users add a database, switch task trackers, enable agent teams later, or want to add an MCP server they skipped initially. Today they must either re-run the full wizard (risking overwrites) or manually edit generated files.

### `ai-init update` Subcommands

```bash
ai-init update                     # Interactive: show current config, offer changes
ai-init update --add-mcp=context7  # Add an MCP server
ai-init update --remove-mcp=beads  # Remove an MCP server
ai-init update --tracker=beads     # Switch task tracker
ai-init update --add-rule=api      # Add a rule that was skipped
ai-init update --enable-teams      # Enable agent teams
ai-init update --pm=pnpm           # Switch package manager references
```

### How It Works

1. **Read existing config** — On first run, the wizard saves its choices to `.ai-init.json` in the project root:

   ```json
   {
     "version": "0.2.0",
     "selectedMcps": ["taskmaster", "context7"],
     "taskTracker": "taskmaster",
     "architecture": "3-tier",
     "selectedRules": ["general", "testing", "git", "api"],
     "pm": "npm",
     "agentTeamsEnabled": false,
     "generatedAt": "2026-02-18T12:00:00Z"
   }
   ```

2. **Diff-based updates** — When `update` runs, it compares the new config against the saved config and only regenerates changed files. Unchanged files are left alone.

3. **Smart merge for settings.json** — The hooks generator already merges into `.claude/settings.json`. The update command extends this pattern to all files that might have user customizations.

4. **Backup on destructive changes** — When removing an MCP or switching tracker, backup affected files to `.ai-init-backup/` before modifying.

### Interactive Update Mode

Running `ai-init update` without flags shows a dashboard of current config with toggle options:

```
Current Configuration:
  MCP Servers:    taskmaster, context7
  Task Tracker:   Task Master
  Architecture:   3-tier
  Rules:          general, testing, git, api, security, config
  Package Manager: npm
  Agent Teams:    disabled

? What would you like to change?
  ❯ Add/remove MCP servers
    Switch task tracker
    Add/remove rules
    Enable agent teams
    Change package manager
    Re-run audit
```

## Value

- **Non-destructive evolution** — projects can grow without losing customizations
- **Reduced friction** — no need to manually edit generated files
- **Config persistence** — `.ai-init.json` serves as a record of what was set up
- **Team alignment** — `.ai-init.json` can be committed, ensuring consistent setup across team

## Changes Required

| File                        | Change                                                                 |
| --------------------------- | ---------------------------------------------------------------------- |
| `src/cli.ts`                | Add `update` subcommand to meow                                        |
| `src/update.ts`             | New file: update command logic, config diffing, selective regeneration |
| `src/types.ts`              | Add `SavedConfig` interface for `.ai-init.json`                        |
| `src/wizard.ts`             | Extract shared prompt functions usable by both wizard and update       |
| `src/phases/post-create.ts` | Refactor `writeFiles` to support diff-based writing                    |
| `src/utils.ts`              | Add `readSavedConfig()`, `writeSavedConfig()`, `backupFiles()` helpers |
| `src/generators/*.ts`       | No changes needed (generators are already pure functions)              |
| `test/update.test.ts`       | New: test update scenarios (add MCP, switch tracker, etc.)             |
| `README.md`                 | Document `ai-init update` subcommand and `.ai-init.json`               |
