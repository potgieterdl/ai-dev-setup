#!/usr/bin/env bash
set -euo pipefail

echo "Running quality gate before commit..."

# 1. Format
npm run format --if-present 2>/dev/null || true

# 2. Lint (fail on errors)
npm run lint --if-present || { echo "BLOCK: Lint errors found. Fix before committing."; exit 1; }

# 3. Type-check
npm run typecheck --if-present || { echo "BLOCK: Type errors found. Fix before committing."; exit 1; }

# 4. Build
npm run build --if-present || { echo "BLOCK: Build failed. Fix before committing."; exit 1; }

# 5. Test
npm test --if-present || { echo "BLOCK: Tests failing. Fix before committing."; exit 1; }

echo "Quality gate passed."
