CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE geo.releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  version integer NOT NULL CHECK (version > 0),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'published', 'retired')),
  checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(source_metadata) = 'object'),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  published_at timestamptz,
  retired_at timestamptz,
  CONSTRAINT geo_release_tenant_identity_unique UNIQUE (id, tenant_id),
  CONSTRAINT geo_release_version_unique UNIQUE (tenant_id, version),
  CONSTRAINT geo_release_lifecycle CHECK (
    (state = 'draft' AND published_at IS NULL AND retired_at IS NULL) OR
    (state = 'published' AND published_at IS NOT NULL AND retired_at IS NULL) OR
    (state = 'retired' AND published_at IS NOT NULL AND retired_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX geo_one_published_release_idx
ON geo.releases (tenant_id) WHERE state = 'published';

CREATE TABLE geo.places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  release_id uuid NOT NULL,
  external_key text NOT NULL,
  parent_id uuid REFERENCES geo.places(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('country', 'province', 'county', 'district', 'rural_district', 'city', 'neighborhood')),
  slug citext NOT NULL,
  name text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  center geography(Point, 4326),
  boundary geometry(MultiPolygon, 4326),
  boundary_simplified geometry(MultiPolygon, 4326),
  bbox geometry(Polygon, 4326),
  depth smallint NOT NULL DEFAULT 0 CHECK (depth BETWEEN 0 AND 8),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT geo_place_tenant_release_fk FOREIGN KEY (release_id, tenant_id) REFERENCES geo.releases(id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT geo_place_tenant_release_identity_unique UNIQUE (id, tenant_id, release_id),
  CONSTRAINT geo_place_external_key_unique UNIQUE (release_id, external_key),
  CONSTRAINT geo_place_not_self_parent CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT geo_place_slug_format CHECK (slug::text ~ '^[a-z0-9][a-z0-9-]{0,95}$'),
  CONSTRAINT geo_neighborhood_has_boundary CHECK (type <> 'neighborhood' OR boundary IS NOT NULL),
  CONSTRAINT geo_center_required CHECK (center IS NOT NULL),
  CONSTRAINT geo_center_iran_bounds CHECK (
    ST_X(center::geometry) BETWEEN 44.0 AND 64.0 AND
    ST_Y(center::geometry) BETWEEN 24.0 AND 40.0
  )
);

CREATE UNIQUE INDEX geo_place_sibling_slug_unique_idx
ON geo.places (release_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
CREATE INDEX geo_places_tree_idx ON geo.places (release_id, parent_id, sort_order, id) WHERE is_active;
CREATE INDEX geo_places_type_idx ON geo.places (release_id, type, sort_order, id) WHERE is_active;
CREATE INDEX geo_places_name_trgm_idx ON geo.places USING gin (name gin_trgm_ops);
CREATE INDEX geo_places_aliases_gin_idx ON geo.places USING gin (aliases);
CREATE INDEX geo_places_center_gist_idx ON geo.places USING gist (center);
CREATE INDEX geo_places_boundary_gist_idx ON geo.places USING gist (boundary) WHERE boundary IS NOT NULL;
CREATE INDEX geo_places_simplified_gist_idx ON geo.places USING gist (boundary_simplified) WHERE boundary_simplified IS NOT NULL;

CREATE OR REPLACE FUNCTION geo.guard_place()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_release uuid;
  parent_tenant uuid;
  parent_type text;
  parent_depth smallint;
  cycle_found boolean;
  allowed_parent boolean;
BEGIN
  IF NEW.boundary IS NOT NULL THEN
    NEW.boundary := ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Force2D(NEW.boundary)), 3));
    IF ST_IsEmpty(NEW.boundary) OR NOT ST_IsValid(NEW.boundary) THEN
      RAISE EXCEPTION 'place boundary is empty or invalid';
    END IF;
    NEW.boundary_simplified := ST_Multi(ST_SimplifyPreserveTopology(NEW.boundary, 0.0001));
    NEW.bbox := ST_Envelope(NEW.boundary);
    IF NEW.center IS NULL THEN NEW.center := ST_PointOnSurface(NEW.boundary)::geography; END IF;
  ELSE
    NEW.boundary_simplified := NULL;
    NEW.bbox := NULL;
  END IF;
  IF NEW.center IS NULL THEN RAISE EXCEPTION 'place center is required when boundary is absent'; END IF;

  IF NEW.parent_id IS NULL THEN
    IF NEW.type <> 'country' THEN RAISE EXCEPTION 'only country may be a root place'; END IF;
    NEW.depth := 0;
    RETURN NEW;
  END IF;

  SELECT release_id, tenant_id, type, depth
    INTO parent_release, parent_tenant, parent_type, parent_depth
    FROM geo.places WHERE id = NEW.parent_id;
  IF parent_release IS NULL OR parent_release <> NEW.release_id OR parent_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'place parent must belong to the same tenant and release';
  END IF;
  allowed_parent := CASE NEW.type
    WHEN 'province' THEN parent_type = 'country'
    WHEN 'county' THEN parent_type = 'province'
    WHEN 'district' THEN parent_type = 'county'
    WHEN 'rural_district' THEN parent_type = 'district'
    WHEN 'city' THEN parent_type IN ('county', 'district')
    WHEN 'neighborhood' THEN parent_type = 'city'
    ELSE false
  END;
  IF NOT allowed_parent THEN RAISE EXCEPTION 'invalid place hierarchy: % cannot contain %', parent_type, NEW.type; END IF;
  NEW.depth := parent_depth + 1;
  IF NEW.depth > 8 THEN RAISE EXCEPTION 'place depth exceeds 8'; END IF;

  WITH RECURSIVE ancestors(id, parent_id) AS (
    SELECT id, parent_id FROM geo.places WHERE id = NEW.parent_id
    UNION ALL
    SELECT place.id, place.parent_id FROM geo.places place JOIN ancestors ON place.id = ancestors.parent_id
  )
  SELECT EXISTS (SELECT 1 FROM ancestors WHERE id = NEW.id) INTO cycle_found;
  IF cycle_found THEN RAISE EXCEPTION 'place hierarchy cycle detected'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER geo_places_guard
BEFORE INSERT OR UPDATE OF parent_id, release_id, tenant_id, type, center, boundary ON geo.places
FOR EACH ROW EXECUTE FUNCTION geo.guard_place();
CREATE TRIGGER geo_places_touch_updated_at
BEFORE UPDATE ON geo.places
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TABLE geo.place_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  release_id uuid NOT NULL,
  place_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  external_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT geo_identifier_place_release_fk FOREIGN KEY (place_id, tenant_id, release_id) REFERENCES geo.places(id, tenant_id, release_id) ON DELETE CASCADE,
  CONSTRAINT geo_provider_identifier_unique UNIQUE (release_id, provider, external_id),
  CONSTRAINT geo_place_provider_unique UNIQUE (place_id, provider)
);

CREATE INDEX geo_identifiers_lookup_idx ON geo.place_identifiers (provider, external_id, release_id);

CREATE TABLE geo.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  release_id uuid REFERENCES geo.releases(id) ON DELETE SET NULL,
  checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  source_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('validated', 'imported', 'failed')),
  counts jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(counts) = 'object'),
  quality jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(quality) = 'object'),
  errors jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(errors) = 'array'),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz,
  CONSTRAINT geo_import_checksum_unique UNIQUE (tenant_id, checksum)
);

DO $$
DECLARE relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY['releases', 'places', 'place_identifiers', 'import_jobs'] LOOP
    EXECUTE format('ALTER TABLE geo.%I ENABLE ROW LEVEL SECURITY', relation_name);
    EXECUTE format('ALTER TABLE geo.%I FORCE ROW LEVEL SECURITY', relation_name);
    EXECUTE format(
      'CREATE POLICY %I ON geo.%I USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid)',
      relation_name || '_tenant_isolation', relation_name
    );
  END LOOP;
END;
$$;
