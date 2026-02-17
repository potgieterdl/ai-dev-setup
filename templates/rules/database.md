---
description: Database access patterns and migration discipline
paths:
  - "src/db/**"
  - "src/models/**"
  - "**/migrations/**"
---

# Database Rules

## Query Safety

- Always use parameterized queries — never concatenate user input into SQL
- Use an ORM or query builder for complex queries
- Keep raw SQL in dedicated query files or functions, never inline in route handlers

## Migration Discipline

- Every schema change requires a migration file
- Migrations must be reversible (include up and down)
- Never modify a migration that has been applied — create a new one
- Test migrations against a fresh database in CI

## Connection Management

- Use connection pooling — never open a new connection per request
- Close connections in shutdown handlers
- Set reasonable timeouts for queries

## Data Integrity

- Define foreign keys and constraints at the database level
- Use transactions for multi-step operations
- Validate data at both application and database layers
