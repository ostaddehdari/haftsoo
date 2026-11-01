ALTER TABLE listing.posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE listing.posts
  ADD CONSTRAINT posts_status_check CHECK (status IN ('pending_review','needs_changes','published','paused','rejected','expired','archived','deleted')),
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  ADD COLUMN moderation_reason_code text,
  ADD COLUMN moderation_message text,
  ADD COLUMN published_at timestamptz,
  ADD COLUMN expires_at timestamptz,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN deleted_at timestamptz;

UPDATE listing.posts
SET published_at = COALESCE(published_at, created_at), expires_at = COALESCE(expires_at, created_at + interval '30 days')
WHERE status = 'published';

CREATE INDEX posts_owner_lifecycle_idx ON listing.posts (tenant_id, owner_id, status, updated_at DESC, id DESC);
CREATE INDEX posts_expiration_job_idx ON listing.posts (expires_at, id) WHERE status IN ('published','paused');
CREATE INDEX posts_soft_delete_job_idx ON listing.posts (deleted_at, id) WHERE status = 'deleted';

CREATE TABLE listing.post_versions (
  tenant_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES listing.posts(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  snapshot jsonb NOT NULL,
  change_kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (post_id, version)
);
CREATE INDEX post_versions_tenant_idx ON listing.post_versions (tenant_id, post_id, version DESC);

CREATE TABLE listing.post_transitions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES listing.posts(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  actor_id uuid,
  actor_type text NOT NULL CHECK (actor_type IN ('owner','moderator','system')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX post_transitions_history_idx ON listing.post_transitions (tenant_id, post_id, created_at DESC);

CREATE TABLE listing.post_moderation_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES listing.posts(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('published','needs_changes','rejected')),
  reason_code text,
  message text,
  moderator_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX post_moderation_history_idx ON listing.post_moderation_messages (tenant_id, post_id, created_at DESC);

CREATE TABLE listing.post_lifecycle_requests (
  tenant_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES listing.posts(id) ON DELETE CASCADE,
  request_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('pause','resume','renew','republish','archive','delete')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, owner_id, request_id)
);

INSERT INTO listing.post_versions (tenant_id, post_id, version, snapshot, change_kind)
SELECT tenant_id, id, version,
       jsonb_build_object('status',status,'title',title,'description',description,'attributes',attributes,'contact',contact,'privacy',privacy),
       'baseline'
FROM listing.posts
ON CONFLICT (post_id, version) DO NOTHING;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['post_versions','post_transitions','post_moderation_messages','post_lifecycle_requests'] LOOP
    EXECUTE format('ALTER TABLE listing.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE listing.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY %I ON listing.%I USING (tenant_id = current_setting(''app.current_tenant_id'')::uuid) WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'')::uuid)', table_name || '_tenant', table_name);
  END LOOP;
END $$;
