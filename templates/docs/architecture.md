# Architecture: {{PROJECT_NAME}}

> **TLDR:** {{PROJECT_NAME}} uses a **{{ARCHITECTURE}}** architecture. This document maps the system's components, their responsibilities, and how they connect.

---

## Table of Contents

- [Overview](#overview)
- [Tier Map](#tier-map)
- [Component Map](#component-map)
- [Key Decisions](#key-decisions)
- [Directory Structure](#directory-structure)

---

## Overview

<!-- TODO: 2-3 sentences describing the overall architecture pattern and why it was chosen -->

## Tier Map

| Tier                                | Responsibility | Tech Stack    |
| ----------------------------------- | -------------- | ------------- |
| <!-- TODO: e.g., Presentation -->   | <!-- TODO -->  | <!-- TODO --> |
| <!-- TODO: e.g., Business Logic --> | <!-- TODO -->  | <!-- TODO --> |
| <!-- TODO: e.g., Data -->           | <!-- TODO -->  | <!-- TODO --> |

## Component Map

| Component     | Location | Responsibility | Depends On    |
| ------------- | -------- | -------------- | ------------- |
| <!-- TODO --> | `src/`   | <!-- TODO -->  | <!-- TODO --> |

## Key Decisions

Architecture decisions are recorded as ADRs in `docs/adr/`.

| ADR                           | Decision      | Status   |
| ----------------------------- | ------------- | -------- |
| [ADR-001](adr/001-example.md) | <!-- TODO --> | Proposed |

## Directory Structure

```
{{PROJECT_NAME}}/
├── src/              # Application source code
│   ├── ...           # <!-- TODO: Map key directories -->
├── test/             # Test files
├── docs/             # Project documentation
│   ├── adr/          # Architecture Decision Records
│   └── ...
└── ...
```
