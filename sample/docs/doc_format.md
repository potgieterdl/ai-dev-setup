# Documentation Format Standard

> **TLDR:** Every project document follows this format — TLDR at top, TOC with anchors, short sections, tables for structured data, relative cross-references. Max ~500 lines per file.

---

## Table of Contents

- [Purpose](#purpose)
- [Structure Rules](#structure-rules)
- [Formatting Rules](#formatting-rules)
- [Cross-References](#cross-references)
- [Agent Optimization](#agent-optimization)

---

## Purpose

This document defines the standard format for all project documentation. Following this format ensures AI agents can efficiently parse and act on project docs without context window issues.

## Structure Rules

| Rule           | Requirement                                          |
| -------------- | ---------------------------------------------------- |
| TLDR           | Every doc starts with a 1-3 sentence summary         |
| TOC            | Table of contents with `#section` anchor links       |
| Section length | Aim for <30 lines per section                        |
| File length    | Max ~500 lines; split into linked sub-docs if larger |
| Data format    | Tables preferred over prose for structured data      |

## Formatting Rules

- Use Markdown headings (`##`, `###`) for sections — never skip levels
- Use tables for lists of items with multiple attributes (APIs, config, mappings)
- Use bullet lists for sequential steps or short enumerations
- Use code blocks with language tags for all code/config examples
- Keep paragraphs short — 2-4 sentences max

## Cross-References

- Use relative links: `See [API docs](api.md#authentication)`
- Never duplicate content — link to the source of truth
- Reference ADRs by number: `See [ADR-001](adr/001-use-jwt-auth.md)`
- Reference source files with path: `See src/auth/login.ts`

## Agent Optimization

- Agents process docs sequentially — front-load the most important information
- Avoid ambiguity: use specific names, not "the module" or "the service"
- Include runnable examples where possible — agents can verify by executing them
- Mark placeholder sections clearly: `<!-- TODO: Fill in after implementation -->`
