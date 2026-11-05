CREATE SCHEMA IF NOT EXISTS admin;
COMMENT ON SCHEMA admin IS 'Platform control plane, executive metrics, alerts, reports and versioned configuration';

CREATE TABLE admin.metric_snapshots(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES platform.tenants(id),bucket_at timestamptz NOT NULL,metrics jsonb NOT NULL DEFAULT '{}'CHECK(jsonb_typeof(metrics)='object'),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(tenant_id,bucket_at)
);CREATE INDEX admin_metric_range_idx ON admin.metric_snapshots(tenant_id,bucket_at DESC);

CREATE TABLE admin.service_health(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES platform.tenants(id),service varchar(80) NOT NULL,status text NOT NULL CHECK(status IN('ok','degraded','down')),latency_ms integer NOT NULL DEFAULT 0 CHECK(latency_ms>=0),availability_bps integer NOT NULL DEFAULT 10000 CHECK(availability_bps BETWEEN 0 AND 10000),version varchar(80) NOT NULL DEFAULT 'unknown',details jsonb NOT NULL DEFAULT '{}'CHECK(jsonb_typeof(details)='object'),checked_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(tenant_id,service)
);CREATE INDEX admin_service_health_state_idx ON admin.service_health(tenant_id,status,checked_at DESC);

CREATE TABLE admin.alerts(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES platform.tenants(id),deduplication_key varchar(160) NOT NULL,severity text NOT NULL CHECK(severity IN('info','warning','critical')),source varchar(80) NOT NULL,title varchar(200) NOT NULL,description varchar(1000) NOT NULL,state text NOT NULL DEFAULT 'open'CHECK(state IN('open','acknowledged','resolved','suppressed')),first_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),occurrence_count integer NOT NULL DEFAULT 1 CHECK(occurrence_count>0),acknowledged_by uuid,acknowledged_at timestamptz,resolved_by uuid,resolved_at timestamptz,resolution_note varchar(500),metadata jsonb NOT NULL DEFAULT '{}'CHECK(jsonb_typeof(metadata)='object'),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(tenant_id,deduplication_key,state)
);CREATE INDEX admin_alert_queue_idx ON admin.alerts(tenant_id,state,severity,last_seen_at DESC)WHERE state IN('open','acknowledged');

CREATE TABLE admin.configurations(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES platform.tenants(id),key varchar(80) NOT NULL,environment text NOT NULL CHECK(environment IN('development','staging','production')),value jsonb NOT NULL CHECK(jsonb_typeof(value)='object'),version integer NOT NULL DEFAULT 1 CHECK(version>0),checksum char(64) NOT NULL CHECK(checksum~'^[a-f0-9]{64}$'),published_by uuid NOT NULL,published_at timestamptz NOT NULL DEFAULT clock_timestamp(),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(tenant_id,environment,key)
);CREATE INDEX admin_configuration_lookup_idx ON admin.configurations(tenant_id,environment,key);

CREATE TABLE admin.change_requests(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES platform.tenants(id),kind text NOT NULL CHECK(kind IN('configuration','feature_flag','maintenance')),resource_key varchar(80) NOT NULL,environment text NOT NULL CHECK(environment IN('development','staging','production')),proposal jsonb NOT NULL CHECK(jsonb_typeof(proposal)='object'),reason varchar(500) NOT NULL,checksum char(64) NOT NULL,proposed_by uuid NOT NULL,approved_by uuid,proposed_at timestamptz NOT NULL DEFAULT clock_timestamp(),approved_at timestamptz,state text NOT NULL DEFAULT 'pending'CHECK(state IN('pending','approved','rejected','cancelled','applied','failed')),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),CHECK(state<>'approved'OR(approved_by IS NOT NULL AND approved_at IS NOT NULL AND approved_by<>proposed_by))
);CREATE INDEX admin_change_queue_idx ON admin.change_requests(tenant_id,state,created_at DESC)WHERE state='pending';

CREATE TABLE admin.configuration_versions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES platform.tenants(id),configuration_id uuid NOT NULL REFERENCES admin.configurations(id)ON DELETE RESTRICT,version integer NOT NULL CHECK(version>0),value jsonb NOT NULL CHECK(jsonb_typeof(value)='object'),checksum char(64) NOT NULL,change_request_id uuid NOT NULL REFERENCES admin.change_requests(id),published_by uuid NOT NULL,published_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(configuration_id,version)
);CREATE INDEX admin_configuration_history_idx ON admin.configuration_versions(tenant_id,configuration_id,version DESC);

CREATE TABLE admin.report_jobs(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES platform.tenants(id),kind text NOT NULL CHECK(kind IN('marketplace','trust','finance','operations')),format text NOT NULL CHECK(format IN('csv','json')),range_from timestamptz NOT NULL,range_to timestamptz NOT NULL,columns jsonb NOT NULL CHECK(jsonb_typeof(columns)='array'),requested_by uuid NOT NULL,state text NOT NULL DEFAULT 'queued'CHECK(state IN('queued','running','ready','failed','expired')),progress integer NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),object_key text,error_code varchar(100),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),started_at timestamptz,completed_at timestamptz,expires_at timestamptz,CHECK(range_from<=range_to)
);CREATE INDEX admin_report_queue_idx ON admin.report_jobs(tenant_id,state,created_at)WHERE state IN('queued','running');

CREATE TABLE admin.audit_log(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES platform.tenants(id),actor_id uuid,actor_role varchar(80),action varchar(120) NOT NULL,resource_type varchar(80) NOT NULL,resource_id uuid,outcome text NOT NULL CHECK(outcome IN('success','denied','failure')),request_id varchar(120) NOT NULL,metadata jsonb NOT NULL DEFAULT '{}'CHECK(jsonb_typeof(metadata)='object'),occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);CREATE INDEX admin_audit_lookup_idx ON admin.audit_log(tenant_id,occurred_at DESC,action);
CREATE FUNCTION admin.reject_audit_mutation()RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION'admin_audit_append_only';END$$;
CREATE TRIGGER admin_audit_immutable BEFORE UPDATE OR DELETE ON admin.audit_log FOR EACH ROW EXECUTE FUNCTION admin.reject_audit_mutation();
CREATE FUNCTION admin.reject_configuration_history_mutation()RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION'admin_configuration_history_append_only';END$$;
CREATE TRIGGER admin_configuration_history_immutable BEFORE UPDATE OR DELETE ON admin.configuration_versions FOR EACH ROW EXECUTE FUNCTION admin.reject_configuration_history_mutation();

DO $$DECLARE table_name text;BEGIN FOREACH table_name IN ARRAY ARRAY['metric_snapshots','service_health','alerts','configurations','change_requests','configuration_versions','report_jobs','audit_log']LOOP EXECUTE format('ALTER TABLE admin.%I ENABLE ROW LEVEL SECURITY',table_name);EXECUTE format('ALTER TABLE admin.%I FORCE ROW LEVEL SECURITY',table_name);EXECUTE format('CREATE POLICY %I ON admin.%I USING(tenant_id=NULLIF(current_setting(''app.current_tenant_id'',true),'''')::uuid)WITH CHECK(tenant_id=NULLIF(current_setting(''app.current_tenant_id'',true),'''')::uuid)',table_name||'_tenant_isolation',table_name);END LOOP;END$$;
