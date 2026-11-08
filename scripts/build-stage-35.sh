#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
node scripts/verify-stage-35.mjs
node scripts/resilience-contract.mjs
node scripts/database-contract.mjs
npm run lint
npm run typecheck
npm run test
npm run build
echo "Stage 35 build completed."
