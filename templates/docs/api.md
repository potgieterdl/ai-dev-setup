# API Reference: {{PROJECT_NAME}}

> **TLDR:** API surface for {{PROJECT_NAME}}. All endpoints, authentication, and error handling documented in table format.

---

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
- [Error Handling](#error-handling)

---

## Base URL

```
<!-- TODO: e.g., http://localhost:3000/api/v1 -->
```

## Authentication

<!-- TODO: Describe auth mechanism (JWT, API key, session, etc.). Reference the relevant ADR. -->

| Method                            | Header          | Format           |
| --------------------------------- | --------------- | ---------------- |
| <!-- TODO: e.g., Bearer Token --> | `Authorization` | `Bearer <token>` |

## Endpoints

| Endpoint      | Method        | Description   | Auth          | ADR           | Source                 |
| ------------- | ------------- | ------------- | ------------- | ------------- | ---------------------- |
| `/health`     | GET           | Health check  | No            | —             | `src/routes/health.ts` |
| <!-- TODO --> | <!-- TODO --> | <!-- TODO --> | <!-- TODO --> | <!-- TODO --> | <!-- TODO -->          |

## Error Handling

All errors return a consistent JSON shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": {}
  }
}
```

| HTTP Status | Code             | Meaning                 |
| ----------- | ---------------- | ----------------------- |
| 400         | `BAD_REQUEST`    | Invalid input           |
| 401         | `UNAUTHORIZED`   | Missing or invalid auth |
| 404         | `NOT_FOUND`      | Resource does not exist |
| 500         | `INTERNAL_ERROR` | Unexpected server error |
