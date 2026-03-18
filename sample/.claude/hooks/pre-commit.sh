#!/usr/bin/env bash
set -euo pipefail

echo "Running quality gate before commit..."

# 1. Format
npm run --if-present format 2>/dev/null || true

# 2. Lint (fail on errors)
npm run --if-present lint || { echo "BLOCK: Lint errors found. Fix before committing."; exit 1; }

# 3. Type-check
npm run --if-present typecheck || { echo "BLOCK: Type errors found. Fix before committing."; exit 1; }

# 4. Build
npm run --if-present build || { echo "BLOCK: Build failed. Fix before committing."; exit 1; }

# 5. Test
npm test --if-present || { echo "BLOCK: Tests failing. Fix before committing."; exit 1; }

echo "Quality gate passed."
