#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY_URL="${HAFTSOO_REPOSITORY_URL:-https://github.com/ostaddehdari/haftsoo.git}"
REPOSITORY_REF="${HAFTSOO_REF:-main}"
INSTALL_DIR="${HAFTSOO_INSTALL_DIR:-/opt/haftsoo}"
DOMAIN="${HAFTSOO_DOMAIN:-srun.ir}"
BASE_PATH="${HAFTSOO_BASE_PATH:-/haftsoo}"
WEB_PORT="${HAFTSOO_WEB_PORT:-3100}"

log() { printf '\n\033[1;32m[haftsoo]\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31m[haftsoo:error]\033[0m %s\n' "$*" >&2; exit 1; }

[[ "${EUID}" -eq 0 ]] || die "Installer must run as root. Use: curl ... | sudo bash"
[[ "${BASE_PATH}" == /* ]] || die "HAFTSOO_BASE_PATH must start with /."
[[ "${BASE_PATH}" != "/" ]] || die "HAFTSOO_BASE_PATH cannot be /."
BASE_PATH="${BASE_PATH%/}"
[[ "${WEB_PORT}" =~ ^[0-9]+$ ]] || die "HAFTSOO_WEB_PORT must be numeric."

if [[ ! -r /etc/os-release ]]; then
  die "Only Debian and Ubuntu servers are supported by this installer."
fi

# shellcheck disable=SC1091
. /etc/os-release
case "${ID:-}" in
  ubuntu|debian) ;;
  *) die "Unsupported distribution: ${ID:-unknown}. Use Ubuntu 22.04/24.04 or Debian 12." ;;
esac

export DEBIAN_FRONTEND=noninteractive
log "Installing operating-system prerequisites"
apt-get update -y
apt-get install -y ca-certificates curl git gnupg python3

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    return
  fi

  log "Installing Docker Engine and Compose plugin from Docker's official repository"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  local codename="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}"
  [[ -n "${codename}" ]] || die "Could not determine distribution codename."
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/%s %s stable\n' \
    "$(dpkg --print-architecture)" "${ID}" "${codename}" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
}

install_docker

if [[ -e "${INSTALL_DIR}" && ! -d "${INSTALL_DIR}/.git" ]]; then
  die "${INSTALL_DIR} exists but is not a Git repository. Move it or choose HAFTSOO_INSTALL_DIR."
fi

if [[ -d "${INSTALL_DIR}/.git" ]]; then
  log "Updating existing repository"
  git -C "${INSTALL_DIR}" diff --quiet || die "Local changes exist in ${INSTALL_DIR}; refusing to overwrite them."
  if [[ "$(git -C "${INSTALL_DIR}" rev-parse --is-shallow-repository)" == "true" ]]; then
    git -C "${INSTALL_DIR}" fetch --unshallow origin "${REPOSITORY_REF}"
  else
    git -C "${INSTALL_DIR}" fetch origin "${REPOSITORY_REF}"
  fi
  git -C "${INSTALL_DIR}" checkout -q "${REPOSITORY_REF}"
  git -C "${INSTALL_DIR}" merge --ff-only FETCH_HEAD
else
  log "Downloading Haftsoo from GitHub"
  install -d -m 0755 "$(dirname "${INSTALL_DIR}")"
  git clone --depth 1 --branch "${REPOSITORY_REF}" "${REPOSITORY_URL}" "${INSTALL_DIR}"
fi

cat > "${INSTALL_DIR}/.env" <<EOF
HAFTSOO_DOMAIN=${DOMAIN}
HAFTSOO_BASE_PATH=${BASE_PATH}
WEB_PORT=${WEB_PORT}
EOF
chmod 0600 "${INSTALL_DIR}/.env"

log "Starting Haftsoo containers"
docker compose --project-directory "${INSTALL_DIR}" --env-file "${INSTALL_DIR}/.env" up -d --pull always --remove-orphans

log "Waiting for the application health check"
healthy=0
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${WEB_PORT}/healthz" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 2
done
[[ "${healthy}" -eq 1 ]] || die "Application did not become healthy on port ${WEB_PORT}."

if command -v nginx >/dev/null 2>&1; then
  log "Configuring the existing Nginx virtual host"
  HAFTSOO_DOMAIN="${DOMAIN}" \
  HAFTSOO_BASE_PATH="${BASE_PATH}" \
  HAFTSOO_WEB_PORT="${WEB_PORT}" \
  HAFTSOO_NGINX_VHOST="${HAFTSOO_NGINX_VHOST:-}" \
    bash "${INSTALL_DIR}/scripts/configure-nginx.sh"
else
  log "Nginx was not found; the container is healthy but the public path was not changed."
  log "Install Nginx, then run: sudo bash ${INSTALL_DIR}/scripts/configure-nginx.sh"
fi

log "Installation completed"
printf 'Public URL: https://%s%s/\n' "${DOMAIN}" "${BASE_PATH}"
printf 'Health URL: http://127.0.0.1:%s/healthz\n' "${WEB_PORT}"
printf 'Install path: %s\n' "${INSTALL_DIR}"

