CREATE TABLE messaging.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  template_key text NOT NULL CHECK (template_key ~ '^[a-z0-9_.-]{3,80}$'), version integer NOT NULL CHECK (version > 0),
  channel text NOT NULL CHECK (channel IN ('in_app','sms','email','push')),
  category text NOT NULL CHECK (category IN ('listing','chat','search','security','finance','marketing','system')),
  locale text NOT NULL DEFAULT 'fa-IR', subject_template text, body_template text NOT NULL CHECK (octet_length(body_template) BETWEEN 1 AND 8000),
  allowed_variables text[] NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), published_at timestamptz,
  UNIQUE (tenant_id,template_key,version,channel,locale)
);
CREATE TABLE messaging.notification_preferences (
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id), user_id uuid NOT NULL,
  in_app_enabled boolean NOT NULL DEFAULT true, sms_enabled boolean NOT NULL DEFAULT false, email_enabled boolean NOT NULL DEFAULT false, push_enabled boolean NOT NULL DEFAULT false,
  categories jsonb NOT NULL DEFAULT '{"listing":true,"chat":true,"search":true,"security":true,"finance":true,"marketing":false,"system":true}'::jsonb,
  quiet_start time, quiet_end time, timezone text NOT NULL DEFAULT 'Asia/Tehran', updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id,user_id), CONSTRAINT quiet_hours_pair CHECK ((quiet_start IS NULL)=(quiet_end IS NULL))
);
CREATE TABLE messaging.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), user_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('listing','chat','search','security','finance','marketing','system')),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','critical')),
  title text NOT NULL CHECK (octet_length(title) BETWEEN 1 AND 320), body text NOT NULL CHECK (octet_length(body) BETWEEN 1 AND 8000),
  action_url text, dedupe_key text NOT NULL, read_at timestamptz, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id,user_id,dedupe_key)
);
CREATE INDEX notifications_inbox_idx ON messaging.notifications(tenant_id,user_id,created_at DESC,id) WHERE archived_at IS NULL;
CREATE INDEX notifications_unread_idx ON messaging.notifications(tenant_id,user_id,created_at DESC) WHERE read_at IS NULL AND archived_at IS NULL;
CREATE TABLE messaging.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), notification_id uuid NOT NULL REFERENCES messaging.notifications(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('in_app','sms','email','push')), provider text,
  state text NOT NULL CHECK (state IN ('queued','sending','sent','delivered','retry','failed','suppressed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 20), next_attempt_at timestamptz, idempotency_key text NOT NULL,
  provider_message_id text, last_error_code text, sent_at timestamptz, delivered_at timestamptz, failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE (tenant_id,idempotency_key)
);
CREATE INDEX notification_delivery_due_idx ON messaging.notification_deliveries(tenant_id,next_attempt_at,id) WHERE state IN ('queued','retry');
CREATE UNIQUE INDEX notification_provider_message_idx ON messaging.notification_deliveries(tenant_id,provider,provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE TABLE messaging.notification_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), provider text NOT NULL,
  provider_message_id text NOT NULL, state text NOT NULL CHECK (state IN ('delivered','failed')), occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE (tenant_id,provider,provider_message_id,state)
);
DO $$ DECLARE table_name text; BEGIN FOREACH table_name IN ARRAY ARRAY['notification_templates','notification_preferences','notifications','notification_deliveries','notification_receipts'] LOOP
  EXECUTE format('ALTER TABLE messaging.%I ENABLE ROW LEVEL SECURITY',table_name); EXECUTE format('ALTER TABLE messaging.%I FORCE ROW LEVEL SECURITY',table_name);
  EXECUTE format('CREATE POLICY %I ON messaging.%I USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid)',table_name||'_tenant_isolation',table_name);
END LOOP; END $$;
