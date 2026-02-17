---
description: Activates when discussing tests, coverage, or demo verification
---

# Testing Skill

## Integration-First Philosophy

When writing tests, default to integration tests that exercise real code paths:

- Use actual database connections (in-memory or test containers)
- Make real HTTP requests to local servers
- Perform real file I/O in temp directories
- Only mock external 3rd-party services that can't run locally

## Demo Test Pattern

Every feature should have at least one demo test proving it works:

```typescript
it("demo: user can sign up and access protected route", async () => {
  const signup = await request(app).post("/auth/signup").send(validUser);
  expect(signup.status).toBe(201);

  const login = await request(app).post("/auth/login").send(credentials);
  const token = login.body.token;

  const protected = await request(app)
    .get("/protected")
    .set("Authorization", `Bearer ${token}`);
  expect(protected.status).toBe(200);
});
```

## When to Use Mocks

Mocks are justified only when:

- The external service has no local equivalent (Stripe, SendGrid, Twilio)
- Running the real service would cause side effects (sending real emails, charging cards)

Always annotate: `// Mock: <service> — no local instance available`

## Test Organization

- Place tests in `test/` directory or alongside source files
- Use `describe` blocks matching the module under test
- Name demo tests with `demo:` prefix
- Name smoke tests with `smoke:` prefix
