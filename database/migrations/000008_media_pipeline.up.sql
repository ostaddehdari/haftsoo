CREATE SCHEMA IF NOT EXISTS media;

CREATE TABLE media.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, owner_id uuid NOT NULL,
  draft_id uuid NOT NULL REFERENCES listing.submission_drafts(id) ON DELETE CASCADE, client_id uuid NOT NULL,
  post_id uuid REFERENCES listing.posts(id), kind text NOT NULL CHECK (kind IN ('image','video')),
  file_name text NOT NULL, content_type text NOT NULL, byte_size bigint NOT NULL CHECK (byte_size > 0),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'), object_key text NOT NULL UNIQUE,
  storage_etag text, status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','uploaded','scanning','processing','ready','rejected','failed','deleted')),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0), is_cover boolean NOT NULL DEFAULT false,
  width integer, height integer, duration_ms integer, perceptual_hash text, public_url text, rejection_code text,
  uploaded_at timestamptz, processed_at timestamptz, deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, draft_id, client_id)
);
CREATE INDEX media_assets_draft_idx ON media.assets (tenant_id, draft_id, position) WHERE status <> 'deleted';
CREATE INDEX media_assets_processing_idx ON media.assets (tenant_id, status, updated_at) WHERE status IN ('uploaded','scanning','processing','failed');
CREATE UNIQUE INDEX media_single_cover_idx ON media.assets (tenant_id, draft_id) WHERE is_cover AND status <> 'deleted';
CREATE UNIQUE INDEX media_same_day_duplicate_idx ON media.assets (tenant_id, owner_id, ((created_at AT TIME ZONE 'Asia/Tehran')::date), perceptual_hash) WHERE perceptual_hash IS NOT NULL AND status <> 'deleted';

CREATE TABLE media.derivatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, asset_id uuid NOT NULL REFERENCES media.assets(id) ON DELETE CASCADE,
  variant text NOT NULL, object_key text NOT NULL UNIQUE, content_type text NOT NULL, byte_size bigint,
  width integer, height integer, duration_ms integer, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, asset_id, variant)
);
CREATE INDEX media_derivatives_asset_idx ON media.derivatives (tenant_id, asset_id);

CREATE TABLE media.processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, asset_id uuid NOT NULL REFERENCES media.assets(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('malware','safety','duplicate','image','video','cleanup')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','dead')),
  attempt integer NOT NULL DEFAULT 0, max_attempts integer NOT NULL DEFAULT 5, available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_error text, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, asset_id, job_type)
);
CREATE INDEX media_processing_jobs_queue_idx ON media.processing_jobs (status, available_at) WHERE status IN ('queued','failed');

ALTER TABLE media.assets ENABLE ROW LEVEL SECURITY; ALTER TABLE media.assets FORCE ROW LEVEL SECURITY;
CREATE POLICY media_assets_tenant ON media.assets USING (tenant_id=current_setting('app.current_tenant_id')::uuid) WITH CHECK (tenant_id=current_setting('app.current_tenant_id')::uuid);
ALTER TABLE media.derivatives ENABLE ROW LEVEL SECURITY; ALTER TABLE media.derivatives FORCE ROW LEVEL SECURITY;
CREATE POLICY media_derivatives_tenant ON media.derivatives USING (tenant_id=current_setting('app.current_tenant_id')::uuid) WITH CHECK (tenant_id=current_setting('app.current_tenant_id')::uuid);
ALTER TABLE media.processing_jobs ENABLE ROW LEVEL SECURITY; ALTER TABLE media.processing_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY media_jobs_tenant ON media.processing_jobs USING (tenant_id=current_setting('app.current_tenant_id')::uuid) WITH CHECK (tenant_id=current_setting('app.current_tenant_id')::uuid);
