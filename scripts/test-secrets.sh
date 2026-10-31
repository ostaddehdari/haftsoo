#!/usr/bin/env bash
set -euo pipefail

test_directory="$(mktemp -d)"
trap 'rm -rf "$test_directory"' EXIT

bash scripts/manage-secrets.sh bootstrap "$test_directory" >/dev/null
bash scripts/manage-secrets.sh verify "$test_directory" >/dev/null

before_hash="$(sha256sum "$test_directory/app_signing_key" | cut -d' ' -f1)"
bash scripts/manage-secrets.sh rotate "$test_directory" app_signing_key >/dev/null
after_hash="$(sha256sum "$test_directory/app_signing_key" | cut -d' ' -f1)"

[[ "$before_hash" != "$after_hash" ]]
[[ "$(stat -c '%a' "$test_directory/app_signing_key")" == "600" ]]
echo "secret lifecycle test passed"
