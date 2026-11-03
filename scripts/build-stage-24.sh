#!/usr/bin/env bash
set -euo pipefail
npm ci --no-audit --no-fund
npm run moderation-operations:contract
npm run verify:stage24
npm run typecheck
npm run test
npm run build

