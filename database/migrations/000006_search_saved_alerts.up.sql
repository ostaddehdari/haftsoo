CREATE SCHEMA IF NOT EXISTS search;

CREATE TABLE search.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name varchar(80) NOT NULL,
  query jsonb NOT NULL,
  query_hash text GENERATED ALWAYS AS (encode(digest(query::text, 'sha256'), 'hex')) STORED,
  alert_enabled boolean NOT NULL DEFAULT false,
  alert_frequency text NOT NULL DEFAULT 'instant' CHECK (alert_frequency IN ('instant', 'daily', 'weekly')),
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX saved_searches_user_hash_active_idx ON search.saved_searches (tenant_id, user_id, query_hash) WHERE deleted_at IS NULL;
CREATE INDEX saved_searches_alert_due_idx ON search.saved_searches (tenant_id, alert_frequency, last_notified_at) WHERE alert_enabled AND deleted_at IS NULL;

CREATE TABLE search.alert_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  saved_search_id uuid NOT NULL REFERENCES search.saved_searches(id) ON DELETE CASCADE,
  post_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('push', 'sms', 'email', 'in_app')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'suppressed')),
  idempotency_key text NOT NULL,
  attempts smallint NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX alert_deliveries_pending_idx ON search.alert_deliveries (next_attempt_at, created_at) WHERE status IN ('pending', 'failed');

CREATE TABLE search.index_checkpoints (
  consumer_name text PRIMARY KEY,
  last_event_id uuid,
  last_event_at timestamptz,
  indexed_count bigint NOT NULL DEFAULT 0,
  failed_count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE search.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search.alert_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_searches_tenant_isolation ON search.saved_searches
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY alert_deliveries_tenant_isolation ON search.alert_deliveries
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
