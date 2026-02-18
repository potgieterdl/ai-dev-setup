#!/usr/bin/env bash
set -euo pipefail

echo "Running quality gate before commit..."

# 1. Format
{{PM_RUN_IF_PRESENT}} format 2>/dev/null || true

# 2. Lint (fail on errors)
{{PM_RUN_IF_PRESENT}} lint || { echo "BLOCK: Lint errors found. Fix before committing."; exit 1; }

# 3. Type-check
{{PM_RUN_IF_PRESENT}} typecheck || { echo "BLOCK: Type errors found. Fix before committing."; exit 1; }

# 4. Build
{{PM_RUN_IF_PRESENT}} build || { echo "BLOCK: Build failed. Fix before committing."; exit 1; }

# 5. Test
{{PM_TEST}} --if-present || { echo "BLOCK: Tests failing. Fix before committing."; exit 1; }

echo "Quality gate passed."
