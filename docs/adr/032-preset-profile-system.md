# ADR-032: Preset/Profile System (F18)

- **Status:** Accepted
- **Feature:** F18 — Preset/Profile System
- **Task:** 30

## Context

Users who repeatedly create similar projects (e.g., fullstack apps, API-only services) must click through the entire 10-step wizard each time. Teams want consistent setups across projects but have no way to share configuration.

## Decision

Implement a preset/profile system that allows users to:

1. **Save** wizard configurations as named JSON files in `~/.ai-dev-setup/presets/`
2. **Apply** presets via `ai-init --preset=<name>` to skip the wizard entirely
3. **Manage** presets with a `presets` subcommand (list, export, import)
4. **Choose** from presets as the first wizard step before manual configuration

### Key Design Choices

**Built-in presets are embedded in code, not on disk.** Three built-in presets (`minimal`, `standard`, `full`) ship as TypeScript constants in `src/presets.ts`. This avoids file I/O for defaults and ensures they're always available even if the presets directory doesn't exist.

**User presets shadow built-ins with the same name.** If a user saves a preset named "minimal", their version takes priority in `listPresets()` but `loadPreset()` checks built-ins first (so `--preset=minimal` always gets the built-in). This allows customization without breaking the defaults.

**PresetConfig is a stable subset of ProjectConfig.** Runtime-only fields (`projectRoot`, `projectName`, `generatedFiles`, `prdPath`, `hasPrd`, `runAudit`, `isExistingProject`, `claudeAuthenticated`, `analysisResult`) are excluded from presets. The `pm` field stores the package manager name string rather than the full `PackageManager` object, and is resolved back on load.

**Dependency injection for testability.** All preset functions accept an optional `dir` parameter defaulting to `PRESETS_DIR`. This allows tests to use isolated temp directories without monkey-patching module constants.

**Preset picker is interactive-only.** The preset selection step only appears in interactive mode (not non-interactive). In non-interactive mode, use `SETUP_AI_PRESET` env var or `--preset` flag.

## Consequences

- **Positive:** Repeat project setup drops from ~2 minutes to ~5 seconds with `--preset`
- **Positive:** Teams can share preset files for consistent environments
- **Positive:** Built-in presets serve as educational examples of good configurations
- **Positive:** Composable with `ai-init update` — apply preset then tweak incrementally
- **Trade-off:** Presets must be kept in sync if `ProjectConfig` fields change; `PresetConfig` acts as a stable subset to mitigate this
- **Trade-off:** `loadPreset` prioritizes built-ins, so user overrides of built-in names only appear in `listPresets` — this is intentional to prevent surprising behavior with `--preset`
