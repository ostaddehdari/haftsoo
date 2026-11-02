#!/usr/bin/env bash
set -euo pipefail
npm run chat:contract
npm run verify:stage20
npm run database:contract
npm run auth:contract
npm run security:baseline
npm run verify:install
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
if command -v go >/dev/null 2>&1; then
  (cd services/chat && test -z "$(gofmt -l .)" && go test -race ./... && go build -trimpath ./cmd/server)
else
  echo "Go toolchain unavailable locally; GitHub CI enforces gofmt, race tests and build."
fi
