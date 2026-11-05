#!/usr/bin/env bash
set -euo pipefail
npm ci --no-audit --no-fund
node scripts/verify-stage-25.mjs
node scripts/crm-contract.mjs
node scripts/database-contract.mjs
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
