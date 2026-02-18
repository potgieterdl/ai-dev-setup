---
description: Testing rules — integration-first philosophy and quality gate
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
---

# Testing Rules

## Default: Integration Tests

- Write tests that exercise real code paths. Use actual database connections, real HTTP requests to local servers, real file I/O.
- Only mock external 3rd-party services. Add a comment: `// Mock: <service> — no local instance available`
- If you find yourself mocking more than 2 dependencies in a test, reconsider: the test may be testing the wrong layer.

## Demo Checkpoints

- Each feature task must produce at least one integration test demonstrating the feature working end-to-end.
- Name demo tests clearly: `it('demo: user can sign up and access protected route')`
- These tests double as regression guards — never delete or skip them.

## Smoke Tests for Wiring Tasks

- Setup/config tasks that don't have a business outcome get smoke tests: app starts, health check passes, key dependencies connect.
- Mark these as `it('smoke: ...')` so they're easy to identify.

## Quality Gate (Pre-Commit)

1. Format: `{{FORMAT_CMD}}`
2. Lint: `{{LINT_CMD}}`
3. Type-check: `{{TYPECHECK_CMD}}`
4. Build: `{{BUILD_CMD}}`
5. Test: `{{TEST_CMD}}`

- Never delete a test to make the suite pass.
- Never mark a task done if tests are failing.
- Never skip the test step in the quality gate.
