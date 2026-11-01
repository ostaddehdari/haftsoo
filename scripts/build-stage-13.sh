#!/usr/bin/env bash
set -euo pipefail
npm ci --no-audit --no-fund
npm run verify:stage13
npm run map:contract
npm run typecheck
npm run test
npm run build
