#!/usr/bin/env bash
set -euo pipefail
npm run auth:contract
npm run verify:stage18
npm run database:contract
npm run security:baseline
npm run verify:install
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
