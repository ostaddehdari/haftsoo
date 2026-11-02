CREATE TABLE identity.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id), display_name varchar(80) NOT NULL,
  bio varchar(300) NOT NULL DEFAULT '', avatar_key text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (char_length(trim(display_name)) BETWEEN 2 AND 80)
);
CREATE TRIGGER user_profiles_touch BEFORE UPDATE ON identity.user_profiles FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TABLE identity.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id), theme text NOT NULL DEFAULT 'system' CHECK(theme IN('system','light','dark')),
  language text NOT NULL DEFAULT 'fa-IR' CHECK(language='fa-IR'), default_city text,
  alert_frequency text NOT NULL DEFAULT 'instant' CHECK(alert_frequency IN('instant','daily','weekly')),
  marketing_messages boolean NOT NULL DEFAULT false, safety_alerts boolean NOT NULL DEFAULT true, search_alerts boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER user_preferences_touch BEFORE UPDATE ON identity.user_preferences FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TABLE identity.bookmark_collections (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES platform.tenants(id), user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  name varchar(60) NOT NULL, is_default boolean NOT NULL DEFAULT false, deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX bookmark_default_collection_idx ON identity.bookmark_collections(tenant_id,user_id) WHERE is_default AND deleted_at IS NULL;
CREATE UNIQUE INDEX bookmark_collection_name_idx ON identity.bookmark_collections(tenant_id,user_id,lower(name)) WHERE deleted_at IS NULL;
CREATE TRIGGER bookmark_collections_touch BEFORE UPDATE ON identity.bookmark_collections FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TABLE identity.bookmarks (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES platform.tenants(id), user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES identity.bookmark_collections(id), post_token varchar(80) NOT NULL,
  deleted_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX bookmarks_user_post_idx ON identity.bookmarks(tenant_id,user_id,post_token) WHERE deleted_at IS NULL;
CREATE INDEX bookmarks_collection_idx ON identity.bookmarks(tenant_id,collection_id,created_at DESC) WHERE deleted_at IS NULL;
CREATE TRIGGER bookmarks_touch BEFORE UPDATE ON identity.bookmarks FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TABLE identity.recent_views (
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id), user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  post_token varchar(80) NOT NULL, title varchar(160) NOT NULL DEFAULT 'آگهی', view_count integer NOT NULL DEFAULT 1 CHECK(view_count>0),
  last_viewed_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(tenant_id,user_id,post_token)
);
CREATE INDEX recent_views_user_idx ON identity.recent_views(tenant_id,user_id,last_viewed_at DESC);

CREATE TABLE identity.user_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES platform.tenants(id), user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN('phone','email','identity','business')), status text NOT NULL DEFAULT 'unverified' CHECK(status IN('unverified','pending','verified','rejected','expired')),
  provider_reference text, verified_at timestamptz, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(tenant_id,user_id,kind)
);
CREATE TRIGGER user_verifications_touch BEFORE UPDATE ON identity.user_verifications FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TABLE identity.user_consents (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES platform.tenants(id), user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK(purpose IN('analytics','personalization','marketing')), granted boolean NOT NULL,
  policy_version varchar(30) NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX user_consents_latest_idx ON identity.user_consents(tenant_id,user_id,purpose,recorded_at DESC);
CREATE OR REPLACE FUNCTION identity.prevent_consent_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'identity.user_consents is append-only'; END; $$;
CREATE TRIGGER user_consents_append_only BEFORE UPDATE OR DELETE ON identity.user_consents FOR EACH ROW EXECUTE FUNCTION identity.prevent_consent_mutation();

CREATE TABLE identity.data_requests (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES platform.tenants(id), user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN('export','delete')), status text NOT NULL CHECK(status IN('queued','processing','ready','pending','completed','cancelled','failed')),
  execute_after timestamptz NOT NULL, artifact_key text, completed_at timestamptz, cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), CHECK(kind<>'delete' OR execute_after>=created_at)
);
CREATE UNIQUE INDEX data_request_active_idx ON identity.data_requests(tenant_id,user_id,kind) WHERE status IN('queued','processing','pending');
CREATE INDEX data_request_worker_idx ON identity.data_requests(kind,status,execute_after) WHERE status IN('queued','pending');

INSERT INTO identity.bookmark_collections(id,tenant_id,user_id,name,is_default)
SELECT gen_random_uuid(),tenant_id,id,'همه نشان‌ها',true FROM identity.users ON CONFLICT DO NOTHING;
INSERT INTO identity.user_verifications(tenant_id,user_id,kind,status,verified_at)
SELECT tenant_id,id,'phone','verified',coalesce(last_login_at,created_at) FROM identity.users ON CONFLICT DO NOTHING;

DO $$ DECLARE table_name text; BEGIN FOREACH table_name IN ARRAY ARRAY['user_profiles','user_preferences','bookmark_collections','bookmarks','recent_views','user_verifications','user_consents','data_requests'] LOOP
  EXECUTE format('ALTER TABLE identity.%I ENABLE ROW LEVEL SECURITY',table_name);
  EXECUTE format('ALTER TABLE identity.%I FORCE ROW LEVEL SECURITY',table_name);
  EXECUTE format('CREATE POLICY %I ON identity.%I USING(tenant_id=NULLIF(current_setting(''app.current_tenant_id'',true),'''')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting(''app.current_tenant_id'',true),'''')::uuid)',table_name||'_tenant_isolation',table_name);
END LOOP; END $$;

ALTER TABLE search.saved_searches FORCE ROW LEVEL SECURITY;
ALTER TABLE search.alert_deliveries FORCE ROW LEVEL SECURITY;
