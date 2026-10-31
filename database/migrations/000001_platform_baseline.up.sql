CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS geo;
CREATE SCHEMA IF NOT EXISTS listing;
CREATE SCHEMA IF NOT EXISTS messaging;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS moderation;
CREATE SCHEMA IF NOT EXISTS audit;

COMMENT ON SCHEMA platform IS 'Shared tenancy and transactional integration primitives';
COMMENT ON SCHEMA identity IS 'Identity service owned data';
COMMENT ON SCHEMA catalog IS 'Category and dynamic field service owned data';
COMMENT ON SCHEMA geo IS 'Geographic hierarchy and PostGIS boundary data';
COMMENT ON SCHEMA listing IS 'Listing aggregate data';
COMMENT ON SCHEMA messaging IS 'Chat metadata; message payloads remain service-owned';
COMMENT ON SCHEMA finance IS 'Financial ledger and payment data';
COMMENT ON SCHEMA moderation IS 'Human and machine moderation decisions';
COMMENT ON SCHEMA audit IS 'Append-only security and operations evidence';

CREATE OR REPLACE FUNCTION platform.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TABLE platform.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug citext NOT NULL UNIQUE,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  CONSTRAINT tenants_slug_format CHECK (slug::text ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  CONSTRAINT tenants_delete_time CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

CREATE TRIGGER tenants_touch_updated_at
BEFORE UPDATE ON platform.tenants
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TABLE platform.resource_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  resource_type text NOT NULL,
  external_key text NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  CONSTRAINT resource_registry_key_unique UNIQUE (tenant_id, resource_type, external_key),
  CONSTRAINT resource_registry_delete_time CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

CREATE INDEX resource_registry_active_lookup_idx
ON platform.resource_registry (tenant_id, resource_type, created_at DESC)
WHERE deleted_at IS NULL;

CREATE TRIGGER resource_registry_touch_updated_at
BEFORE UPDATE ON platform.resource_registry
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

ALTER TABLE platform.resource_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.resource_registry FORCE ROW LEVEL SECURITY;

CREATE POLICY resource_registry_tenant_isolation
ON platform.resource_registry
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
