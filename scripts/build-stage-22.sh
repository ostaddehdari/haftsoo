#!/usr/bin/env bash
set -euo pipefail
npm ci --no-audit --no-fund
npm run verify:stage22
npm run notification:contract
npm run database:contract
npm run typecheck
npm run test
npm run build
npm run verify:install
