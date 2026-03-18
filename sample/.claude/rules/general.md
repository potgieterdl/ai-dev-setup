---
description: Project-wide conventions and coding standards
paths:
  - "**/*"
---

# General Conventions

## Language & Runtime

- **Language:** TypeScript
- **Package Manager:** npm

## Toolchain Commands

| Action     | Command              |
| ---------- | -------------------- |
| Format     | `npm run format`     |
| Lint       | `npm run lint`       |
| Type-check | `npm run typecheck`  |
| Build      | `npm run build`      |
| Test       | `npm test`       |

## Coding Style

- Follow the project's configured formatter and linter
- Prefer `const` over `let`; avoid mutable state where possible
- Use named exports over default exports
- Keep functions small and focused — one responsibility per function
- Use early returns to reduce nesting

## Naming Conventions

- **Files:** kebab-case (`mcp-json.ts`, `post-create.ts`)
- **Types/Interfaces:** PascalCase (`ProjectConfig`, `FileDescriptor`)
- **Functions/Variables:** camelCase (`writeFiles`, `selectedMcps`)
- **Constants:** UPPER_SNAKE_CASE for true constants (`MAX_RETRIES`)
- **Directories:** kebab-case (`generators/`, `test-fixtures/`)

## Documentation

- Refer to `docs/` for project context — each doc follows `docs/doc_format.md`
- Check `docs/adr/` before making architectural decisions
- Update relevant docs when changing behavior
