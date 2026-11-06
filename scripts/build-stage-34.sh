#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
node scripts/verify-stage-34.mjs
node scripts/performance-contract.mjs
node scripts/database-contract.mjs
npm run lint
npm run typecheck
npm run test
npm run build
echo "Stage 34 build completed."
