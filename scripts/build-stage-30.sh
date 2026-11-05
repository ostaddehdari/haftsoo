#!/usr/bin/env bash
set -euo pipefail
npm ci --no-audit --no-fund
node scripts/verify-stage-30.mjs
node scripts/admin-control-plane-contract.mjs
node scripts/database-contract.mjs
node scripts/security-baseline.mjs
node scripts/verify-install-assets.mjs
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
