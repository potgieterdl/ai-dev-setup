# ADR-020: Linting, Formatting, and Build Pipeline Configuration

- **Status:** Accepted
- **Context:** The project needs a quality gate infrastructure (lint, format, type-check, build, test) that all other tasks depend on. The task description suggested creating `.eslintrc.cjs` (legacy ESLint config format), but the project already had an `eslint.config.js` (ESLint flat config) from initial setup. ESLint 10 is installed, which uses flat config by default. A decision was needed on which ESLint config format to use and how to integrate Prettier without conflicts.
- **Decision:**
  - **ESLint flat config** (`eslint.config.js`) is kept instead of downgrading to legacy `.eslintrc.cjs`. ESLint 10 uses flat config natively; legacy config requires compatibility layers.
  - **`typescript-eslint` unified package** replaces the separate `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` packages. The unified package is the recommended approach for ESLint 9+ flat config.
  - **`eslint-config-prettier`** is added to disable ESLint formatting rules that conflict with Prettier, preventing format fights between the two tools.
  - **Prettier config** (`.prettierrc`) uses `"singleQuote": false` because the existing codebase consistently uses double quotes (matching the default Prettier behavior and the established code style).
  - **`.prettierignore`** excludes `dist/`, `node_modules/`, `templates/` (raw markdown templates should not be reformatted), `.taskmaster/`, and `agent_logs/`.
  - **Package.json scripts** follow a consistent pattern: `lint` (fix mode), `lint:check` (check-only), `format` (write mode), `format:check` (check-only). The `:check` variants are for CI gates.
  - **`.gitignore`** updated to include `*.js.map` (source maps) and `.ai-init-audit.md` (F11 transient audit artifact).
- **Consequences:**
  - All quality gate scripts (`format:check`, `lint:check`, `typecheck`, `build`, `test`) exit cleanly with zero errors.
  - The `pre-commit.sh` hook template (from F3/Task 6) can rely on these scripts being present and functional.
  - Future tasks that add source files will automatically be covered by the lint/format/typecheck pipeline.
  - The `templates/` directory is excluded from formatting to preserve template content exactly as authored.
