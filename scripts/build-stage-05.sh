#!/usr/bin/env bash
set -euo pipefail

npm run verify:stage5
npm run security:baseline
npm run lint
npm run format:check
npm run typecheck --workspace @haftsoo/api
npm run test:security
bash scripts/test-secrets.sh

echo "Stage 05 build gate passed."
