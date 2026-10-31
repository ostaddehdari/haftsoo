#!/usr/bin/env bash
set -euo pipefail

umask 077

command_name="${1:-}"
secret_directory="${2:-ops/secrets/runtime}"
secret_names=(postgres_password minio_root_user minio_root_password app_signing_key)

write_secret() {
  local name="$1"
  local target="$secret_directory/$name"
  local temporary
  temporary="$(mktemp "$secret_directory/.${name}.XXXXXX")"

  if [[ "$name" == "minio_root_user" ]]; then
    printf 'haftsoo_%s\n' "$(openssl rand -hex 8)" >"$temporary"
  else
    openssl rand -base64 48 | tr -d '\n' >"$temporary"
    printf '\n' >>"$temporary"
  fi

  chmod 0600 "$temporary"
  mv -f "$temporary" "$target"
}

verify_secrets() {
  local name mode
  for name in "${secret_names[@]}"; do
    [[ -s "$secret_directory/$name" ]] || {
      echo "missing secret: $name" >&2
      return 1
    }
    mode="$(stat -c '%a' "$secret_directory/$name")"
    [[ "$mode" == "600" ]] || {
      echo "invalid mode for $name: $mode" >&2
      return 1
    }
  done
}

case "$command_name" in
  bootstrap)
    install -d -m 0700 "$secret_directory"
    for secret_name in "${secret_names[@]}"; do
      [[ -s "$secret_directory/$secret_name" ]] || write_secret "$secret_name"
    done
    verify_secrets
    echo "secret set ready: $secret_directory"
    ;;
  rotate)
    rotate_name="${3:-}"
    [[ " ${secret_names[*]} " == *" $rotate_name "* ]] || {
      echo "unsupported secret name" >&2
      exit 2
    }
    install -d -m 0700 "$secret_directory"
    write_secret "$rotate_name"
    echo "rotated: $rotate_name"
    ;;
  verify)
    verify_secrets
    echo "secret set verified: $secret_directory"
    ;;
  *)
    echo "usage: $0 {bootstrap|verify} [directory]" >&2
    echo "       $0 rotate [directory] <name>" >&2
    exit 2
    ;;
esac
