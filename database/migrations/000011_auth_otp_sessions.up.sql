CREATE TABLE identity.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  phone_hash text NOT NULL, phone_masked text NOT NULL, phone_ciphertext text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK(status IN('active','blocked','deleted')),
  last_login_at timestamptz NOT NULL DEFAULT clock_timestamp(), created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(tenant_id,phone_hash)
);
CREATE TRIGGER identity_users_touch BEFORE UPDATE ON identity.users FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TABLE identity.otp_challenges (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES platform.tenants(id), pre_auth_session_id text NOT NULL UNIQUE,
  phone_hash text NOT NULL, phone_masked text NOT NULL, phone_ciphertext text NOT NULL, code_hash text NOT NULL,
  delivery_method text NOT NULL CHECK(delivery_method IN('sms','call','messenger')), ip_hash text NOT NULL, user_agent_hash text NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5), expires_at timestamptz NOT NULL, cooldown_until timestamptz NOT NULL,
  consumed_at timestamptz, last_failed_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX otp_challenge_window_idx ON identity.otp_challenges(tenant_id,phone_hash,created_at DESC);
CREATE INDEX otp_challenge_ip_window_idx ON identity.otp_challenges(tenant_id,ip_hash,created_at DESC);

CREATE TABLE identity.devices (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES platform.tenants(id), user_id uuid NOT NULL REFERENCES identity.users(id),
  fingerprint text NOT NULL, display_name text NOT NULL, device_kind text NOT NULL CHECK(device_kind IN('desktop','mobile','tablet','unknown')),
  user_agent_hash text NOT NULL, trusted_at timestamptz, revoked_at timestamptz, first_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(), created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(tenant_id,user_id,fingerprint)
);
CREATE TRIGGER identity_devices_touch BEFORE UPDATE ON identity.devices FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TABLE identity.sessions (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES platform.tenants(id), user_id uuid NOT NULL REFERENCES identity.users(id), device_id uuid NOT NULL REFERENCES identity.devices(id),
  status text NOT NULL DEFAULT 'active' CHECK(status IN('active','revoked','expired')), access_token_hash text NOT NULL UNIQUE,
  access_expires_at timestamptz NOT NULL, idle_expires_at timestamptz NOT NULL, last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_ip_hash text NOT NULL, last_ip_label text NOT NULL DEFAULT '', revoked_at timestamptz, revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), CHECK(revoked_at IS NULL OR status='revoked')
);
CREATE INDEX active_sessions_user_idx ON identity.sessions(tenant_id,user_id,last_seen_at DESC) WHERE status='active';

CREATE TABLE identity.refresh_tokens (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES platform.tenants(id), session_id uuid NOT NULL REFERENCES identity.sessions(id), family_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, used_at timestamptz, revoked_at timestamptz, replaced_by_id uuid REFERENCES identity.refresh_tokens(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX refresh_family_idx ON identity.refresh_tokens(tenant_id,family_id,created_at DESC);

CREATE TABLE identity.auth_events (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES platform.tenants(id), user_id uuid REFERENCES identity.users(id), session_id uuid REFERENCES identity.sessions(id),
  action text NOT NULL, outcome text NOT NULL CHECK(outcome IN('success','failure','denied')), ip_hash text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(), CHECK(jsonb_typeof(metadata)='object')
);
CREATE INDEX auth_events_user_idx ON identity.auth_events(tenant_id,user_id,occurred_at DESC);

CREATE TABLE identity.login_alerts (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES platform.tenants(id), user_id uuid NOT NULL REFERENCES identity.users(id), session_id uuid NOT NULL REFERENCES identity.sessions(id),
  channel text NOT NULL CHECK(channel IN('sms','messenger','email')), payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','sent','failed')), attempts smallint NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(), sent_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), CHECK(jsonb_typeof(payload)='object')
);
CREATE INDEX login_alert_queue_idx ON identity.login_alerts(status,next_attempt_at) WHERE status IN('pending','failed');

CREATE OR REPLACE FUNCTION identity.prevent_auth_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'identity.auth_events is append-only'; END; $$;
CREATE TRIGGER auth_events_append_only BEFORE UPDATE OR DELETE ON identity.auth_events FOR EACH ROW EXECUTE FUNCTION identity.prevent_auth_event_mutation();

ALTER TABLE identity.users ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.users FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.otp_challenges ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.otp_challenges FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.devices ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.devices FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.sessions ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.refresh_tokens ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.refresh_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.auth_events ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.auth_events FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.login_alerts ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.login_alerts FORCE ROW LEVEL SECURITY;
CREATE POLICY users_tenant_isolation ON identity.users USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid);
CREATE POLICY otp_challenges_tenant_isolation ON identity.otp_challenges USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid);
CREATE POLICY devices_tenant_isolation ON identity.devices USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid);
CREATE POLICY sessions_tenant_isolation ON identity.sessions USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid);
CREATE POLICY refresh_tokens_tenant_isolation ON identity.refresh_tokens USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid);
CREATE POLICY auth_events_tenant_isolation ON identity.auth_events USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid);
CREATE POLICY login_alerts_tenant_isolation ON identity.login_alerts USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid);
