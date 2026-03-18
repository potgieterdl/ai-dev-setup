---
description: Security practices for authentication, middleware, and sensitive data
paths:
  - "src/auth/**"
  - "src/middleware/**"
  - "**/*secret*"
---

# Security Rules

## Input Validation

- Validate all external input at the boundary (API routes, CLI args, env vars)
- Use schema validation (Zod, Joi) rather than manual checks
- Never trust client-side validation alone

## Credential Handling

- Never log secrets, tokens, passwords, or API keys
- Never hardcode credentials — use environment variables
- Store sensitive config in `.env` and document keys in `.env.example`
- Add `.env` to `.gitignore` — never commit secrets

## Authentication & Authorization

- Use established libraries for auth (bcrypt for hashing, JWT for tokens)
- Set secure token expiry times
- Validate tokens on every protected route
- Apply least-privilege principle — only grant required permissions

## OWASP Basics

- Sanitize output to prevent XSS
- Use parameterized queries to prevent SQL injection
- Set security headers (CORS, CSP, HSTS)
- Rate-limit authentication endpoints
- Validate Content-Type on all requests
