CREATE TABLE moderation.model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  model_key text NOT NULL CHECK (model_key ~ '^[a-z0-9_.-]{3,80}$'), version text NOT NULL CHECK (octet_length(version) BETWEEN 1 AND 100),
  task text NOT NULL CHECK (task IN ('text_safety','vision_safety','duplicate','risk_ensemble')),
  thresholds jsonb NOT NULL DEFAULT '{}'::jsonb, status text NOT NULL DEFAULT 'shadow' CHECK (status IN ('shadow','active','retired')),
  activated_at timestamptz, retired_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id,model_key,version)
);

CREATE TABLE moderation.duplicate_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), post_id uuid NOT NULL REFERENCES listing.posts(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL, category_slug citext NOT NULL, city_key text NOT NULL, normalized_text text NOT NULL, content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  image_hashes text[] NOT NULL DEFAULT '{}', device_hash text, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id,post_id)
);
CREATE INDEX duplicate_signature_window_idx ON moderation.duplicate_signatures(tenant_id,category_slug,city_key,created_at DESC);
CREATE INDEX duplicate_signature_owner_day_idx ON moderation.duplicate_signatures(tenant_id,owner_id,((created_at AT TIME ZONE 'Asia/Tehran')::date),content_hash);

CREATE TABLE moderation.content_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), post_id uuid NOT NULL REFERENCES listing.posts(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('allow','review','reject')), risk_score numeric(6,5) NOT NULL CHECK (risk_score BETWEEN 0 AND 1),
  reason_codes text[] NOT NULL DEFAULT '{}', signals jsonb NOT NULL DEFAULT '[]'::jsonb, explanation text NOT NULL DEFAULT '', model_version text NOT NULL,
  duplicate_of_post_id uuid REFERENCES listing.posts(id), created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX moderation_evaluations_post_idx ON moderation.content_evaluations(tenant_id,post_id,created_at DESC);
CREATE INDEX moderation_evaluations_risk_idx ON moderation.content_evaluations(tenant_id,risk_score DESC,created_at DESC);

CREATE TABLE moderation.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), post_id uuid NOT NULL REFERENCES listing.posts(id) ON DELETE CASCADE,
  evaluation_id uuid NOT NULL REFERENCES moderation.content_evaluations(id), state text NOT NULL CHECK (state IN ('open','claimed','appealed','resolved','cancelled')),
  priority smallint NOT NULL CHECK (priority BETWEEN 0 AND 100), reason_codes text[] NOT NULL DEFAULT '{}', duplicate_of_post_id uuid REFERENCES listing.posts(id),
  claimed_by uuid, claimed_at timestamptz, resolved_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX moderation_case_active_idx ON moderation.cases(tenant_id,post_id) WHERE state IN ('open','claimed','appealed');
CREATE INDEX moderation_queue_idx ON moderation.cases(tenant_id,state,priority DESC,created_at ASC);

CREATE TABLE moderation.case_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), case_id uuid NOT NULL REFERENCES moderation.cases(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN ('text_span','image_label','duplicate_post','device_link','user_report','rule')),
  payload jsonb NOT NULL, source_version text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX moderation_case_evidence_idx ON moderation.case_evidence(tenant_id,case_id,created_at);

CREATE TABLE moderation.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), case_id uuid NOT NULL REFERENCES moderation.cases(id),
  moderator_id uuid NOT NULL, decision text NOT NULL CHECK (decision IN ('approve','needs_changes','reject')), reason_code text NOT NULL,
  note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX moderation_decisions_case_idx ON moderation.decisions(tenant_id,case_id,created_at DESC);

CREATE TABLE moderation.appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), case_id uuid NOT NULL REFERENCES moderation.cases(id), owner_id uuid NOT NULL,
  statement text NOT NULL CHECK (octet_length(statement) BETWEEN 20 AND 8000), state text NOT NULL DEFAULT 'open' CHECK (state IN ('open','accepted','rejected')),
  resolved_by uuid, resolution_note text, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), resolved_at timestamptz
);
CREATE UNIQUE INDEX moderation_appeal_open_idx ON moderation.appeals(tenant_id,case_id) WHERE state='open';

CREATE TABLE moderation.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), evaluation_id uuid NOT NULL REFERENCES moderation.content_evaluations(id),
  decision_id uuid REFERENCES moderation.decisions(id), label text NOT NULL CHECK (label IN ('true_positive','false_positive','false_negative','confirmed_duplicate')),
  features_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX moderation_feedback_model_idx ON moderation.feedback(tenant_id,label,created_at DESC);

DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['model_versions','duplicate_signatures','content_evaluations','cases','case_evidence','decisions','appeals','feedback'] LOOP
    EXECUTE format('ALTER TABLE moderation.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE moderation.%I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY %I ON moderation.%I USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'',true),'''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'',true),'''')::uuid)',table_name||'_tenant_isolation',table_name);
  END LOOP;
END $$;
