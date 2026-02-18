---
description: Project-wide conventions and coding standards
paths:
  - "**/*"
---

# General Conventions

## Language & Runtime

- **Language:** {{LANGUAGE}}
- **Package Manager:** {{PM_NAME}}

## Toolchain Commands

| Action     | Command              |
| ---------- | -------------------- |
| Format     | `{{FORMAT_CMD}}`     |
| Lint       | `{{LINT_CMD}}`       |
| Type-check | `{{TYPECHECK_CMD}}`  |
| Build      | `{{BUILD_CMD}}`      |
| Test       | `{{TEST_CMD}}`       |

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
