#!/usr/bin/env bash
set -euo pipefail
npm run geo:national:contract
npm run geo:national:qa
npm run verify:stage9
npm run database:contract
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build

if [[ "${RUN_DATABASE_DRILL:-0}" == "1" ]]; then
  bash scripts/recovery-drill.sh
fi

echo "Stage 09 build gate passed."
