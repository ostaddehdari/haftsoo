CREATE TABLE listing.submission_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, actor_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','submitted')),
  current_step text NOT NULL DEFAULT 'category' CHECK (current_step IN ('category','details','location','media','contact','preview')),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0), payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_checksum text, autosaved_at timestamptz, submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX submission_drafts_actor_idx ON listing.submission_drafts (tenant_id, actor_id, updated_at DESC);

CREATE TABLE listing.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, owner_id uuid NOT NULL,
  submission_draft_id uuid NOT NULL UNIQUE REFERENCES listing.submission_drafts(id),
  status text NOT NULL CHECK (status IN ('pending_review','published','rejected','expired')),
  title text NOT NULL, category_slug citext NOT NULL, city_key text NOT NULL, neighborhood_keys text[] NOT NULL DEFAULT '{}',
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb, description text NOT NULL DEFAULT '', contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  privacy jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX posts_discovery_idx ON listing.posts (tenant_id, status, city_key, category_slug, created_at DESC);

CREATE TABLE listing.submission_requests (
  tenant_id uuid NOT NULL, actor_id uuid NOT NULL, draft_id uuid NOT NULL REFERENCES listing.submission_drafts(id),
  idempotency_key text NOT NULL, payload_checksum text NOT NULL, post_id uuid NOT NULL REFERENCES listing.posts(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY (tenant_id, actor_id, idempotency_key)
);

ALTER TABLE listing.submission_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing.submission_drafts FORCE ROW LEVEL SECURITY;
CREATE POLICY submission_drafts_tenant ON listing.submission_drafts USING (tenant_id = current_setting('app.current_tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
ALTER TABLE listing.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing.posts FORCE ROW LEVEL SECURITY;
CREATE POLICY posts_tenant ON listing.posts USING (tenant_id = current_setting('app.current_tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
ALTER TABLE listing.submission_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing.submission_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY submission_requests_tenant ON listing.submission_requests USING (tenant_id = current_setting('app.current_tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
