ALTER TABLE listing.posts
  ADD COLUMN public_token text,
  ADD COLUMN slug text,
  ADD COLUMN location geography(Point,4326),
  ADD COLUMN location_precision_m integer NOT NULL DEFAULT 700 CHECK (location_precision_m BETWEEN 250 AND 5000),
  ADD COLUMN seller_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE listing.posts SET public_token=substr(encode(digest(id::text,'sha256'),'hex'),1,12),slug='post' WHERE public_token IS NULL;
ALTER TABLE listing.posts ALTER COLUMN public_token SET NOT NULL,ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX posts_public_token_idx ON listing.posts(tenant_id,public_token);
CREATE INDEX posts_public_location_idx ON listing.posts USING gist(location) WHERE status='published';

CREATE TABLE listing.post_contact_reveals (
  tenant_id uuid NOT NULL, post_id uuid NOT NULL REFERENCES listing.posts(id) ON DELETE CASCADE, actor_id uuid NOT NULL,
  request_id text NOT NULL, revealed_phone text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(tenant_id,actor_id,request_id)
);
CREATE INDEX post_contact_reveals_post_idx ON listing.post_contact_reveals(tenant_id,post_id,created_at DESC);
CREATE TABLE listing.post_bookmarks (
  tenant_id uuid NOT NULL, actor_id uuid NOT NULL, post_id uuid NOT NULL REFERENCES listing.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(tenant_id,actor_id,post_id)
);
CREATE TABLE listing.post_notes (
  tenant_id uuid NOT NULL, actor_id uuid NOT NULL, post_id uuid NOT NULL REFERENCES listing.posts(id) ON DELETE CASCADE,
  note text NOT NULL CHECK(length(note)<=500),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(tenant_id,actor_id,post_id)
);
CREATE TABLE moderation.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,post_id uuid NOT NULL REFERENCES listing.posts(id) ON DELETE CASCADE,
  actor_id uuid,reason text NOT NULL CHECK(reason IN ('fraud','duplicate','wrong_category','sold','prohibited','other')),description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','reviewing','resolved','dismissed')),created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX post_reports_queue_idx ON moderation.post_reports(tenant_id,status,created_at);
CREATE TABLE audit.post_actions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,tenant_id uuid NOT NULL,post_id uuid NOT NULL REFERENCES listing.posts(id) ON DELETE CASCADE,
  actor_id uuid,action text NOT NULL,payload jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX post_actions_post_idx ON audit.post_actions(tenant_id,post_id,created_at DESC);

DO $$ DECLARE table_name text; schema_name text; BEGIN
  FOR schema_name,table_name IN SELECT * FROM (VALUES ('listing','post_contact_reveals'),('listing','post_bookmarks'),('listing','post_notes'),('moderation','post_reports'),('audit','post_actions')) AS t(schema_name,table_name) LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',schema_name,table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',schema_name,table_name);
    EXECUTE format('CREATE POLICY %I ON %I.%I USING (tenant_id=current_setting(''app.current_tenant_id'')::uuid) WITH CHECK (tenant_id=current_setting(''app.current_tenant_id'')::uuid)',table_name||'_tenant',schema_name,table_name);
  END LOOP;
END $$;
