---
description: RESTful API conventions and input validation
paths:
  - "src/api/**"
  - "src/routes/**"
---

# API Rules

## RESTful Conventions

- Use standard HTTP methods: GET (read), POST (create), PUT (replace), PATCH (partial update), DELETE (remove)
- Use plural nouns for resources: `/users`, `/tasks`, `/projects`
- Use HTTP status codes correctly: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error
- Version APIs in the URL path: `/api/v1/users`

## Standard Error Shape

All errors return a consistent JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": []
  }
}
```

## Input Validation

- Validate request body, query params, and path params at the route level
- Return 400 with specific field errors — never expose internal details
- Use schema validation for complex inputs

## Documentation

- Keep `@docs/api.md` updated when adding or changing endpoints
- Include the endpoint, method, description, auth requirement, and source file
- Reference relevant ADRs for non-obvious design choices

## Pagination

- Use cursor-based or offset pagination for list endpoints
- Always include total count or next cursor in responses
- Default page size: 20; max: 100
