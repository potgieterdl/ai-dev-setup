# ADR-016: CLI Entry Point with Argument Parsing

- **Status:** Accepted
- **Context:** The CLI entry point (`src/cli.ts`) needed proper argument parsing to handle subcommands (`on-create`, `post-create`, `post-start`) and flags (`--non-interactive`, `--no-audit`, `--overwrite`). The initial implementation used manual `process.argv` parsing, which was fragile and couldn't handle flag combinations cleanly. `meow` was already listed as a dependency but unused.
- **Decision:**
  - Adopted `meow` for argument parsing — it provides typed flags, auto-generated `--help`/`--version`, and ESM support via `importMeta`.
  - Moved `--non-interactive` from being treated as a subcommand to a proper boolean flag, aligning with standard CLI conventions.
  - Added `--no-audit` flag (meow's `--no-` prefix negation for the `audit` flag) to skip the Claude Code audit step from the command line.
  - Added `--overwrite` flag (default: `true`) passed through to `runPostCreate()`.
  - Added Claude Code bootstrap (check/install) in the default interactive flow before the wizard starts, matching F11 Part 1 spec.
  - Made `post-start` use `defaultConfig()` directly instead of running the full wizard, since post-start only needs project root and defaults for env sync and banner display.
  - Extracted `printGeneratedFiles()` and `printNextSteps()` helpers for summary output after file generation.
- **Consequences:**
  - `meow` is now the single source of truth for CLI flag definitions and help text.
  - `--non-interactive` works both as a flag and via `SETUP_AI_NONINTERACTIVE=1` env var.
  - The `post-start` command is now lightweight — no wizard prompts, no API calls.
  - Breaking change: `ai-init --non-interactive` is now a flag, not a positional command. Users who passed it as a command get the same behavior since meow parses it as a flag regardless of position.
