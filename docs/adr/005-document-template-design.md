# ADR-005: Document Template Design

- **Status:** Accepted
- **Context:** The tool scaffolds project documentation via `templates/docs/` — plain markdown files with `{{PLACEHOLDER}}` markers that `fillTemplate()` substitutes at generation time. A consistent template design is needed so all generated docs are immediately useful to both humans and AI agents, following the format standard from F2 of the PRD.
- **Decision:**
  - All documentation templates live in `templates/docs/` as plain markdown — no templating engine, no special syntax beyond `{{PLACEHOLDER}}` markers.
  - A `doc_format.md` meta-standard defines the rules all docs follow: TLDR at top, TOC with anchor links, sections under 30 lines, tables for structured data, max ~500 lines per file.
  - Templates that represent user-facing documents (prd, architecture, api, cuj, testing_strategy, onboarding) follow the doc_format standard with TLDR, TOC, and structured sections.
  - Special-purpose templates (adr_template, tasks_simple) are exempt from the full doc_format standard since they serve different structural purposes (ADRs are short decisions; task tracker is a status table).
  - The PRD template includes `Demo test` fields per feature, aligning with the F9 testing strategy philosophy — every feature must be demonstrable.
  - The simple task tracker (`tasks_simple.md`) includes `Demo command` and `Success` fields per task, ensuring agents know what "done" looks like.
  - Placeholder names are uppercase with underscores: `{{PROJECT_NAME}}`, `{{ARCHITECTURE}}`, `{{DATE}}`, `{{NUMBER}}`, `{{TITLE}}`. Unmatched placeholders are preserved by `fillTemplate()`.
  - TODO comments use `<!-- TODO: description -->` HTML comment syntax so they're invisible in rendered markdown but scannable by agents and grep.
- **Consequences:**
  - Templates are human-readable and editable without special tooling.
  - Adding a new template requires no code changes to the templating system — just create a markdown file with `{{PLACEHOLDER}}` markers.
  - The doc_format standard is self-enforcing: the standard itself follows its own rules, and tests verify all templates comply.
  - The `tasks_simple.md` template provides a zero-dependency task tracking option that doesn't require Task Master or Beads.
