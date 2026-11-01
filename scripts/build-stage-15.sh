#!/usr/bin/env bash
set -euo pipefail
npm run verify:stage15
npm run media:contract
npm run database:contract
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
