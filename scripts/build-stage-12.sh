#!/usr/bin/env bash
set -euo pipefail

npm run verify:stage12
npm run verify:all
npm run search:contract
npm run search:quality
npm run database:contract
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
echo "Stage 12 search and relevance build gate passed."
