#!/usr/bin/env bash
set -euo pipefail
npm run listing:contract
npm run verify:stage16
npm run typecheck
npm run test
npm run build
