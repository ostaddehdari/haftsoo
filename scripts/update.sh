#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="${HAFTSOO_INSTALL_DIR:-/opt/haftsoo}"
REF="${HAFTSOO_REF:-main}"

[[ "${EUID}" -eq 0 ]] || { echo "Run as root." >&2; exit 1; }
[[ -d "${INSTALL_DIR}/.git" ]] || { echo "Haftsoo is not installed in ${INSTALL_DIR}." >&2; exit 1; }
git -C "${INSTALL_DIR}" diff --quiet || { echo "Local changes detected; update stopped." >&2; exit 1; }
if [[ "$(git -C "${INSTALL_DIR}" rev-parse --is-shallow-repository)" == "true" ]]; then
  git -C "${INSTALL_DIR}" fetch --unshallow origin "${REF}"
else
  git -C "${INSTALL_DIR}" fetch origin "${REF}"
fi
git -C "${INSTALL_DIR}" checkout -q "${REF}"
git -C "${INSTALL_DIR}" merge --ff-only FETCH_HEAD
docker compose --project-directory "${INSTALL_DIR}" --env-file "${INSTALL_DIR}/.env" up -d --pull always --remove-orphans
curl -fsS "http://127.0.0.1:$(sed -n 's/^WEB_PORT=//p' "${INSTALL_DIR}/.env")/healthz"
echo
echo "Haftsoo updated successfully."

