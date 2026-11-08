#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
node scripts/verify-stage-38.mjs
node scripts/quality-contract.mjs
node scripts/database-contract.mjs
node scripts/security-baseline.mjs
npm run lint
npm run typecheck
npm run test
npm run build
echo "Stage 38 build completed."
