#!/usr/bin/env bash
set -euo pipefail
npm ci --no-audit --no-fund
npm run verify:stage23
npm run moderation:contract
npm run database:contract
npm run security:baseline
npm run typecheck
npm run test
npm run build
npm run verify:install
