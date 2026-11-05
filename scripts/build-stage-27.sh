#!/usr/bin/env bash
set -euo pipefail
npm ci --no-audit --no-fund
node scripts/verify-stage-27.mjs
node scripts/monetization-contract.mjs
node scripts/database-contract.mjs
node scripts/security-baseline.mjs
node scripts/verify-install-assets.mjs
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
