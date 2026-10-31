#!/usr/bin/env bash
set -euo pipefail

container_name="haftsoo-recovery-$RANDOM-$$"
temporary_directory="$(mktemp -d)"
credential_value="$(openssl rand -hex 24)"
printf 'POSTGRES_DB=haftsoo\nPOSTGRES_USER=haftsoo\nPOSTGRES_PASSWORD=%s\n' \
  "$credential_value" >"$temporary_directory/postgres.env"
chmod 0600 "$temporary_directory/postgres.env"

cleanup() {
  docker rm -f "$container_name" >/dev/null 2>&1 || true
  rm -rf "$temporary_directory"
}
trap cleanup EXIT

docker run -d --name "$container_name" \
  --env-file "$temporary_directory/postgres.env" \
  postgis/postgis:17-3.5-alpine >/dev/null

for attempt in $(seq 1 60); do
  if docker exec "$container_name" pg_isready -U haftsoo -d haftsoo >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" == "60" ]]; then
    echo "PostGIS did not become ready" >&2
    exit 1
  fi
  sleep 1
done

docker exec "$container_name" psql -v ON_ERROR_STOP=1 -U haftsoo -d haftsoo -c \
  "CREATE EXTENSION IF NOT EXISTS postgis; CREATE TABLE recovery_probe (id bigint PRIMARY KEY, geom geometry(Point,4326)); INSERT INTO recovery_probe VALUES (1, ST_SetSRID(ST_MakePoint(51.6776,32.6546),4326));" >/dev/null

docker exec "$container_name" pg_dump -U haftsoo -d haftsoo -Fc >"$temporary_directory/haftsoo.dump"
test -s "$temporary_directory/haftsoo.dump"

docker exec "$container_name" dropdb --force -U haftsoo haftsoo
docker exec "$container_name" createdb -U haftsoo haftsoo
docker exec -i "$container_name" pg_restore -U haftsoo -d haftsoo --exit-on-error <"$temporary_directory/haftsoo.dump"

row_count="$(docker exec "$container_name" psql -At -U haftsoo -d haftsoo -c 'SELECT count(*) FROM recovery_probe;')"
postgis_version="$(docker exec "$container_name" psql -At -U haftsoo -d haftsoo -c 'SELECT PostGIS_Version();')"

[[ "$row_count" == "1" ]]
[[ -n "$postgis_version" ]]
echo "recovery drill passed: rows=$row_count postgis=$postgis_version"
