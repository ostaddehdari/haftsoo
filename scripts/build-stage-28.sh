#!/usr/bin/env bash
set -euo pipefail
npm ci --no-audit --no-fund
node scripts/verify-stage-28.mjs
node scripts/business-contract.mjs
node scripts/database-contract.mjs
node scripts/security-baseline.mjs
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
