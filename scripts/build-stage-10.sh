#!/usr/bin/env bash
set -euo pipefail
npm run verify:stage10
npm run verify:all
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build

echo "Stage 10 public shell build gate passed."
