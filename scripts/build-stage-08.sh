#!/usr/bin/env bash
set -euo pipefail

npm run verify:stage8
npm run geo:contract
npm run geo:validate
npm run database:contract
npm run lint
npm run format:check
npm run typecheck --workspace @haftsoo/api
npm run test --workspace @haftsoo/api

if [[ "${RUN_DATABASE_DRILL:-0}" == "1" ]]; then
  bash scripts/recovery-drill.sh
fi

echo "Stage 08 build gate passed."
