#!/usr/bin/env bash
set -euo pipefail
npm ci --no-audit --no-fund
node scripts/verify-stage-29.mjs
node scripts/public-ui-contract.mjs
node scripts/verify-install-assets.mjs
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
