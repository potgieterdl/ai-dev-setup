# ADR-009: Document Scaffolding Generator

- **Status:** Accepted
- **Feature:** F2 (Document Scaffolding)
- **Task:** 9 — Implement Document Scaffolding Generator
- **Date:** 2026-02-17

## Context

The CLI scaffolds a `docs/` folder with agent-optimized document templates (PRD, architecture, CUJ, testing strategy, onboarding, doc format standard, ADR template). Templates live in `templates/docs/` and use `{{PLACEHOLDER}}` markers for project-specific values. The generator reads these templates, applies substitution, and returns `FileDescriptor[]` for the file I/O layer to write.

Key requirements:

- Core docs (6 files) are always generated
- API docs (`docs/api.md`) are conditional on `config.hasApiDocs`
- ADR template is always included with `NNN` and `Decision Title` as placeholder values
- Simple markdown task file (`TASKS.md`) is only generated when `config.taskTracker === 'markdown'`
- All `{{PROJECT_NAME}}`, `{{ARCHITECTURE}}`, `{{DATE}}`, and `{{TASK_TRACKER}}` placeholders must be replaced

## Decision

- **Async generator** — `generateDocs(config: ProjectConfig): Promise<FileDescriptor[]>` is async because it reads template files from disk. This differs from `generateClaudeMd()` (sync, builds from config values) and `generateMcpJson()` (sync, builds from registry data). The async nature is inherent to the template-reading pattern.
- **Template directory resolved via `import.meta.url`** — Using `fileURLToPath(import.meta.url)` to resolve the `templates/docs/` directory relative to the source file. This works correctly in ESM (the project uses `"type": "module"`) and survives TypeScript compilation to `dist/`.
- **`fillTemplate()` reuse** — Uses the existing `fillTemplate()` utility from `utils.ts` which replaces `{{KEY}}` markers. Unmatched placeholders are left as-is, which is the correct behavior for the ADR template (where `NNN` and `Decision Title` are intentional user-facing placeholders).
- **Conditional files via config flags** — API docs depend on `hasApiDocs`, TASKS.md depends on `taskTracker === 'markdown'`. This keeps the generator logic simple: core docs always, then conditional additions.
- **Date is generated at call time** — `{{DATE}}` is replaced with `new Date().toISOString().split('T')[0]` (YYYY-MM-DD format). This means the date reflects when the CLI was run, not when the template was authored.

## Consequences

- Adding a new doc template requires: (1) adding the `.md` file to `templates/docs/`, (2) adding an entry to `CORE_DOCS` or a conditional block in the generator. The template test suite (from Task 5) already validates template file existence and structure.
- The generator reads from the filesystem, so tests run against the actual template files (integration-style). This is deliberate — it catches issues like missing templates or broken placeholder syntax that pure unit tests would miss.
- Trade-off: Template reading at generation time adds I/O latency, but this is negligible (< 10ms for all templates) and only runs once during setup.
