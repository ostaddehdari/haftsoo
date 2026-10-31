#!/usr/bin/env bash
set -euo pipefail

npm run verify:stage4
npm run test:capacity
npm run lint
npm run format:check
bash scripts/test-secrets.sh

secret_directory="$(mktemp -d)"
trap 'rm -rf "$secret_directory"' EXIT
bash scripts/manage-secrets.sh bootstrap "$secret_directory" >/dev/null

HAFTSOO_IMAGE_TAG=sha-000000000000 \
HAFTSOO_SECRET_DIR="$secret_directory" \
  docker compose -f ops/compose/staging.yaml config --quiet

if [[ "${RUN_RECOVERY_DRILL:-0}" == "1" ]]; then
  bash scripts/recovery-drill.sh
fi

echo "Stage 04 build gate passed."
