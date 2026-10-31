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
  initialization_complete="$(docker logs "$container_name" 2>&1 | grep -c 'PostgreSQL init process complete' || true)"
  if [[ "$initialization_complete" -ge 1 ]] && \
    docker exec "$container_name" psql -At -U haftsoo -d haftsoo -c 'SELECT 1;' >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" == "60" ]]; then
    docker logs "$container_name" >&2 || true
    echo "PostGIS did not become ready" >&2
    exit 1
  fi
  sleep 1
done

mapfile -t up_migrations < <(find database/migrations -maxdepth 1 -name '*.up.sql' -print | sort)
mapfile -t down_migrations < <(find database/migrations -maxdepth 1 -name '*.down.sql' -print | sort -r)
[[ "${#up_migrations[@]}" -ge 2 ]]
[[ "${#up_migrations[@]}" -eq "${#down_migrations[@]}" ]]

for migration in "${up_migrations[@]}"; do
  docker exec -i "$container_name" psql -v ON_ERROR_STOP=1 -U haftsoo -d haftsoo <"$migration" >/dev/null
done

tenant_id="123e4567-e89b-42d3-a456-426614174000"
resource_id="223e4567-e89b-42d3-a456-426614174000"
event_id="323e4567-e89b-42d3-a456-426614174000"
docker exec "$container_name" psql -v ON_ERROR_STOP=1 -U haftsoo -d haftsoo -c \
  "INSERT INTO platform.tenants (id, slug, display_name) VALUES ('$tenant_id', 'public', 'Public');
   BEGIN;
   SELECT set_config('app.current_tenant_id', '$tenant_id', true);
   INSERT INTO platform.resource_registry (id, tenant_id, resource_type, external_key, attributes)
   VALUES ('$resource_id', '$tenant_id', 'recovery_probe', 'isfahan', '{\"status\":\"ready\"}');
   INSERT INTO platform.outbox_events (id, tenant_id, aggregate_type, aggregate_id, event_type, payload)
   VALUES ('$event_id', '$tenant_id', 'recovery_probe', '$resource_id', 'recovery.created', '{\"version\":1}');
   INSERT INTO platform.inbox_receipts (consumer, event_id, tenant_id)
   VALUES ('recovery-consumer', '$event_id', '$tenant_id');
   COMMIT;" >/dev/null

docker exec "$container_name" pg_dump -U haftsoo -d haftsoo -Fc >"$temporary_directory/haftsoo.dump"
test -s "$temporary_directory/haftsoo.dump"

docker exec "$container_name" createdb --template=template0 -U haftsoo haftsoo_restore
docker exec -i "$container_name" pg_restore -U haftsoo -d haftsoo_restore --exit-on-error <"$temporary_directory/haftsoo.dump"

row_count="$(docker exec "$container_name" psql -At -U haftsoo -d haftsoo_restore -c "WITH setting AS (SELECT set_config('app.current_tenant_id', '$tenant_id', false)) SELECT count(*) FROM platform.resource_registry, setting;")"
outbox_count="$(docker exec "$container_name" psql -At -U haftsoo -d haftsoo_restore -c "WITH setting AS (SELECT set_config('app.current_tenant_id', '$tenant_id', false)) SELECT count(*) FROM platform.outbox_events, setting;")"
postgis_version="$(docker exec "$container_name" psql -At -U haftsoo -d haftsoo_restore -c 'SELECT PostGIS_Version();')"
schema_count="$(docker exec "$container_name" psql -At -U haftsoo -d haftsoo_restore -c "SELECT count(*) FROM information_schema.schemata WHERE schema_name IN ('platform','identity','catalog','geo','listing','messaging','finance','moderation','audit');")"
partition_count="$(docker exec "$container_name" psql -At -U haftsoo -d haftsoo_restore -c "SELECT count(*) FROM pg_inherits WHERE inhparent = 'platform.outbox_events'::regclass;")"

[[ "$row_count" == "1" ]]
[[ "$outbox_count" == "1" ]]
[[ -n "$postgis_version" ]]
[[ "$schema_count" == "9" ]]
[[ "$partition_count" -ge 1 ]]

for migration in "${down_migrations[@]}"; do
  docker exec -i "$container_name" psql -v ON_ERROR_STOP=1 -U haftsoo -d haftsoo <"$migration" >/dev/null
done
remaining_schema="$(docker exec "$container_name" psql -At -U haftsoo -d haftsoo -c "SELECT count(*) FROM information_schema.schemata WHERE schema_name = 'platform';")"
[[ "$remaining_schema" == "0" ]]
for migration in "${up_migrations[@]}"; do
  docker exec -i "$container_name" psql -v ON_ERROR_STOP=1 -U haftsoo -d haftsoo <"$migration" >/dev/null
done

echo "recovery drill passed: rows=$row_count outbox=$outbox_count schemas=$schema_count partitions=$partition_count postgis=$postgis_version"
