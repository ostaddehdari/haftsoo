#!/usr/bin/env bash
set -euo pipefail
npm ci --no-audit --no-fund
npm run analytics:contract
npm run verify:stage31
npm run database:contract
npm run security:baseline
npm run typecheck
npm run test
npm run build
