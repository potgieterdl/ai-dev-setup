# Testing Strategy: {{PROJECT_NAME}}

> **TLDR:** Integration tests over mocks. Every feature has a demo test. The quality gate runs format, lint, type-check, build, and tests before every commit.

---

## Table of Contents

- [Philosophy](#philosophy)
- [Test Types](#test-types)
- [Demo Tests](#demo-tests)
- [Mock Policy](#mock-policy)
- [Quality Gate](#quality-gate)
- [Writing Tests](#writing-tests)

---

## Philosophy

1. **Integration tests by default** — test real behavior with real dependencies
2. **Every feature is demonstrable** — a "done" feature has a test a human can run to see it working
3. **No false green** — a mock-heavy test suite that always passes is worse than no tests
4. **Tests are regression guards** — never delete a failing test to make CI green

## Test Types

| Type        | When to Use                                   | Naming                  |
| ----------- | --------------------------------------------- | ----------------------- |
| Integration | Default for all features                      | `*.integration.test.ts` |
| Smoke       | Setup/wiring tasks (app starts, health check) | `it('smoke: ...')`      |
| Unit        | Pure functions, utilities, algorithms         | `*.test.ts`             |
| Demo        | Proves a feature works end-to-end             | `it('demo: ...')`       |

## Demo Tests

Each feature task should produce at least one demo test:

```typescript
it("demo: user can sign up and access protected route", async () => {
  // Real HTTP requests to local server
  // Real database operations
  // Verifies the complete user journey
});
```

Name demo tests clearly with the `demo:` prefix — they double as proof of feature completion and regression guards.

## Mock Policy

- **Default: No mocks.** Use real instances for databases, queues, internal services
- **Allowed:** External 3rd-party services (payment gateways, email APIs, etc.)
- **Required annotation:** Every mock needs a comment: `// Mock: <service> — no local instance available`
- **Red flag:** If you mock more than 2 dependencies, you're testing the wrong layer

## Quality Gate

Run before every commit (enforced by pre-commit hook):

| Step          | Command              | Must Pass    |
| ------------- | -------------------- | ------------ |
| 1. Format     | `{{FORMAT_CMD}}`     | Yes          |
| 2. Lint       | `{{LINT_CMD}}`       | Yes (errors) |
| 3. Type-check | `{{TYPECHECK_CMD}}`  | Yes          |
| 4. Build      | `{{BUILD_CMD}}`      | Yes          |
| 5. Test       | `{{TEST_CMD}}`       | Yes          |

## Writing Tests

- Place tests alongside source or in a `test/` mirror directory
- Use `describe` blocks matching the module under test
- One assertion per `it` block where practical
- Include setup/teardown for shared resources (DB connections, servers)
- Use test fixtures for complex input data
