CREATE TABLE platform.outbox_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  event_version integer NOT NULL DEFAULT 1 CHECK (event_version > 0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  headers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(headers) = 'object'),
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  PRIMARY KEY (occurred_at, id),
  CONSTRAINT outbox_publish_time CHECK (published_at IS NULL OR published_at >= occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE platform.outbox_events_default
PARTITION OF platform.outbox_events DEFAULT;

CREATE INDEX outbox_unpublished_idx
ON platform.outbox_events (available_at, occurred_at, id)
WHERE published_at IS NULL;

CREATE INDEX outbox_aggregate_idx
ON platform.outbox_events (tenant_id, aggregate_type, aggregate_id, occurred_at DESC);

CREATE TABLE platform.inbox_receipts (
  consumer text NOT NULL,
  event_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  processed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (clock_timestamp() + interval '30 days'),
  result_hash text,
  PRIMARY KEY (consumer, event_id),
  CONSTRAINT inbox_process_time CHECK (processed_at IS NULL OR processed_at >= received_at),
  CONSTRAINT inbox_expiry_time CHECK (expires_at > received_at)
);

CREATE INDEX inbox_expiry_idx ON platform.inbox_receipts (expires_at);
CREATE INDEX inbox_tenant_received_idx ON platform.inbox_receipts (tenant_id, received_at DESC);

ALTER TABLE platform.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.outbox_events FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.inbox_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.inbox_receipts FORCE ROW LEVEL SECURITY;

CREATE POLICY outbox_tenant_isolation
ON platform.outbox_events
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY inbox_tenant_isolation
ON platform.inbox_receipts
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE TABLE platform.archive_manifest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relation_name text NOT NULL,
  partition_name text NOT NULL UNIQUE,
  range_start timestamptz NOT NULL,
  range_end timestamptz NOT NULL,
  object_key text NOT NULL UNIQUE,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  row_count bigint NOT NULL CHECK (row_count >= 0),
  archived_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  restored_at timestamptz,
  CONSTRAINT archive_range CHECK (range_end > range_start)
);
