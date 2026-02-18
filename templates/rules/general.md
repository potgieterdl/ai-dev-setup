---
description: Project-wide conventions and coding standards
paths:
  - "**/*"
---

# General Conventions

## Language & Runtime

- **Language:** {{LANGUAGE}}
- **Runtime:** Node.js ≥ 20
- **Module system:** ESM (`"type": "module"` in package.json)

## Package Manager

- Use `{{PM_NAME}}` for dependency management
- Always use `{{PM_INSTALL}}` in CI environments
- Prefer `@latest` when adding new packages — never guess version numbers
- Lock files are source of truth — do not edit manually

## Coding Style

- Follow the project's Prettier and ESLint configurations
- Use strict TypeScript (`strict: true`) — no `any` unless unavoidable with a `// eslint-disable` + comment
- Prefer `const` over `let`; never use `var`
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
