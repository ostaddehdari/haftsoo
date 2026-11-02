#!/usr/bin/env bash
set -euo pipefail
npm run chat-ui:contract
npm run verify:stage21
npm run chat:contract
npm run security:baseline
npm run verify:install
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
