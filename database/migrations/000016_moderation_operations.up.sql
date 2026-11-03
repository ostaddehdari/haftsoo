ALTER TABLE moderation.cases DROP CONSTRAINT cases_state_check;
ALTER TABLE moderation.cases ADD CONSTRAINT cases_state_check CHECK (state IN ('open','claimed','appealed','escalated','resolved','cancelled'));
DROP INDEX moderation.moderation_case_active_idx;
CREATE UNIQUE INDEX moderation_case_active_idx ON moderation.cases(tenant_id,post_id) WHERE state IN ('open','claimed','appealed','escalated');
ALTER TABLE moderation.cases
  ADD COLUMN source text NOT NULL DEFAULT 'automated' CHECK (source IN ('automated','user_report','staff','appeal')),
  ADD COLUMN risk_band text NOT NULL DEFAULT 'normal' CHECK (risk_band IN ('critical','high','normal','low')),
  ADD COLUMN report_count integer NOT NULL DEFAULT 0 CHECK (report_count >= 0),
  ADD COLUMN sla_due_at timestamptz,
  ADD COLUMN sla_breached_at timestamptz,
  ADD COLUMN claim_expires_at timestamptz,
  ADD COLUMN escalation_level smallint NOT NULL DEFAULT 0 CHECK (escalation_level BETWEEN 0 AND 3),
  ADD COLUMN last_activity_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX moderation_operations_queue_idx ON moderation.cases(tenant_id,state,sla_due_at,priority DESC);
CREATE INDEX moderation_claim_expiry_idx ON moderation.cases(tenant_id,claim_expires_at) WHERE state='claimed';

CREATE TABLE moderation.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), post_id uuid NOT NULL REFERENCES listing.posts(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES moderation.cases(id) ON DELETE CASCADE, reporter_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('scam','prohibited','duplicate','harassment','wrong_category','sold','misleading','other')),
  description text NOT NULL DEFAULT '' CHECK (octet_length(description)<=8000), fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  risk_band text NOT NULL CHECK (risk_band IN ('critical','high','normal','low')), status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','triaged','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), resolved_at timestamptz, UNIQUE(tenant_id,fingerprint)
);
CREATE INDEX user_reports_case_idx ON moderation.user_reports(tenant_id,case_id,created_at DESC);
CREATE INDEX user_reports_post_idx ON moderation.user_reports(tenant_id,post_id,created_at DESC);

CREATE TABLE moderation.case_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES platform.tenants(id), case_id uuid NOT NULL REFERENCES moderation.cases(id) ON DELETE CASCADE,
  actor_id uuid, event_type text NOT NULL CHECK (event_type ~ '^[a-z][a-z0-9_]{2,79}$'), payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX moderation_case_events_idx ON moderation.case_events(tenant_id,case_id,created_at,id);

CREATE TABLE moderation.sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), queue_key text NOT NULL DEFAULT 'content',
  risk_band text NOT NULL CHECK (risk_band IN ('critical','high','normal','low')), target_minutes integer NOT NULL CHECK (target_minutes BETWEEN 5 AND 10080),
  warning_percent smallint NOT NULL DEFAULT 75 CHECK (warning_percent BETWEEN 25 AND 95), active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(tenant_id,queue_key,risk_band)
);

CREATE TABLE moderation.escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), case_id uuid NOT NULL REFERENCES moderation.cases(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL, level smallint NOT NULL CHECK (level BETWEEN 1 AND 3), reason text NOT NULL, note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX moderation_escalations_case_idx ON moderation.escalations(tenant_id,case_id,created_at DESC);

CREATE TABLE moderation.quality_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), case_id uuid NOT NULL REFERENCES moderation.cases(id),
  decision_id uuid REFERENCES moderation.decisions(id), reviewer_id uuid NOT NULL, outcome text NOT NULL CHECK (outcome IN ('agree','coach','overturn')),
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 100), feedback text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(tenant_id,case_id,reviewer_id)
);

DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['user_reports','case_events','sla_policies','escalations','quality_reviews'] LOOP
    EXECUTE format('ALTER TABLE moderation.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE moderation.%I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY %I ON moderation.%I USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'',true),'''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'',true),'''')::uuid)',table_name||'_tenant_isolation',table_name);
  END LOOP;
END $$;

