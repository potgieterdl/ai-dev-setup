---
description: Configuration management and environment variable handling
paths:
  - "**/*.config.*"
  - "**/.env*"
---

# Configuration Rules

## Environment Variables

- Never hardcode secrets, API keys, or connection strings
- Use `.env` for local development; load with `dotenv` or framework equivalent
- Document every env var in `.env.example` with descriptions and dummy values
- Validate required env vars at startup — fail fast with clear error messages

## Configuration Files

- Keep configuration files in the project root
- Use TypeScript/JSON for typed config where possible
- Separate config by environment: `.env.development`, `.env.test`, `.env.production`
- Never commit `.env` — only `.env.example`

## Secrets

- Use `**/*secret*` path matching to trigger security rules automatically
- Rotate credentials regularly
- Use a secrets manager (Vault, AWS Secrets Manager) in production
