#!/usr/bin/env bash
set -euo pipefail
npm run post-detail:contract
npm run verify:stage17
npm run database:contract
npm run verify:install
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
