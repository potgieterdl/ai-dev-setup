---
description: Documentation standards and maintenance rules
paths:
  - "docs/**"
---

# Documentation Rules

## Format Standard

All docs follow `docs/doc_format.md`:

- Start with `# Title`
- Include a TLDR (1–3 sentences) right after the title
- Add a Table of Contents linking to `#section` anchors
- Keep sections under 30 lines
- Use tables for structured data (APIs, config, mappings)
- Max ~500 lines per doc — split into linked sub-docs if larger
- Cross-reference with relative links: `See [API docs](api.md#authentication)`

## Creating New Docs

1. Copy the structure from an existing doc that matches the purpose
2. Include TLDR, TOC, and short sections
3. Use `<!-- TODO: description -->` for placeholder content
4. Link from relevant existing docs (architecture, onboarding, etc.)

## Updating Docs

- When changing behavior, update the corresponding doc
- Never duplicate information — link to the source of truth
- Keep ADR docs immutable once accepted — create new ADRs to supersede

## ADR Format

Follow `docs/adr/NNN-title.md`:

- **Status:** Accepted | Superseded | Deprecated
- **Context:** Why the decision was needed
- **Decision:** What was decided
- **Consequences:** Trade-offs accepted
