#!/usr/bin/env bash
set -euo pipefail
npm ci --no-audit --no-fund
npm run verify:stage14
npm run submission:contract
npm run database:contract
npm run typecheck
npm run test
npm run build
