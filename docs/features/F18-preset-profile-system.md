# F18: Preset/Profile System — Save & Share Wizard Configs

## TLDR

Let users save wizard configurations as named presets (e.g., "fullstack", "api-only", "minimal") and apply them instantly — enabling one-command setup for recurring project types.

## Description

Developers often create similar projects repeatedly: a team lead always picks the same MCP servers, tracker, and rules. Instead of clicking through the wizard each time, presets let them save a configuration once and reuse it.

### Preset Storage

Presets are stored as JSON files in `~/.ai-dev-setup/presets/`:

```
~/.ai-dev-setup/presets/
├── default.json          # Built-in sensible defaults
├── fullstack.json        # User-created: all features
├── api-minimal.json      # User-created: API project, few rules
└── team-acme.json        # Shared: team-specific config
```

### Preset Format

```json
{
  "name": "fullstack",
  "description": "Full-stack project with all bells and whistles",
  "config": {
    "selectedMcps": ["taskmaster", "context7", "browsermcp"],
    "taskTracker": "taskmaster",
    "architecture": "3-tier",
    "selectedRules": ["general", "testing", "git", "security", "api", "database", "config"],
    "selectedSkills": ["testing", "commit", "task-workflow"],
    "selectedHookSteps": ["format", "lint", "typecheck", "build", "test"],
    "pm": "pnpm",
    "agentTeamsEnabled": false
  }
}
```

### CLI Usage

```bash
# Save current wizard choices as a preset
ai-init --save-preset=fullstack

# Apply a preset (skips wizard, runs immediately)
ai-init --preset=fullstack

# List available presets
ai-init presets

# Export preset for sharing (prints to stdout)
ai-init presets --export=fullstack > fullstack-preset.json

# Import a shared preset
ai-init presets --import=fullstack-preset.json
```

### Built-in Presets

Ship with 3 built-in presets users can customize:

| Preset     | MCPs                 | Tracker    | Rules                                   | Description                   |
| ---------- | -------------------- | ---------- | --------------------------------------- | ----------------------------- |
| `minimal`  | taskmaster           | markdown   | general, git                            | Quick start, minimal files    |
| `standard` | taskmaster, context7 | taskmaster | general, testing, git, security, config | Recommended for most projects |
| `full`     | all                  | taskmaster | all                                     | Everything enabled            |

### Wizard Integration

At the start of the wizard, if presets exist:

```
? Start from a preset or configure manually?
  ❯ standard (recommended)  Taskmaster + Context7, common rules
    fullstack               All features enabled
    Configure manually      Step-by-step wizard
```

## Value

- **Speed** — repeat project setup drops from 2 minutes to 5 seconds
- **Consistency** — teams share a preset to ensure identical setups
- **Discoverability** — built-in presets teach users what good configs look like
- **Composable with `update`** — apply a preset then tweak via `ai-init update`

## Changes Required

| File                   | Change                                                         |
| ---------------------- | -------------------------------------------------------------- |
| `src/cli.ts`           | Add `--preset`, `--save-preset` flags and `presets` subcommand |
| `src/presets.ts`       | New file: load/save/list/export/import preset logic            |
| `src/types.ts`         | Add `Preset` interface                                         |
| `src/wizard.ts`        | Add preset selection as first prompt (if presets exist)        |
| `src/defaults.ts`      | Ship built-in presets as embedded JSON                         |
| `install.sh`           | Create `~/.ai-dev-setup/presets/` directory on install         |
| `test/presets.test.ts` | New: test save/load/apply/export/import flows                  |
| `README.md`            | Document preset system and CLI flags                           |
