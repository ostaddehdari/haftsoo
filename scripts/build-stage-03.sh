#!/usr/bin/env bash
set -Eeuo pipefail

npm install --no-audit --no-fund
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build

(
  cd services/chat
  test -z "$(gofmt -l .)"
  go test ./...
  go build -trimpath ./cmd/server
)

docker compose -f compose.dev.yaml config --quiet
echo "Stage 03 reproducible build gate passed."
