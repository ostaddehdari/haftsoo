ALTER TABLE geo.places DROP CONSTRAINT geo_neighborhood_has_boundary;
ALTER TABLE geo.places DROP CONSTRAINT geo_center_required;

ALTER TABLE geo.places ADD CONSTRAINT geo_place_spatial_state CHECK (
  center IS NOT NULL OR boundary IS NOT NULL OR
  type IN ('country', 'province', 'city') OR
  metadata->>'boundaryStatus' IN ('not_available', 'pending')
);
ALTER TABLE geo.places ADD CONSTRAINT geo_neighborhood_spatial_state CHECK (
  type <> 'neighborhood' OR boundary IS NOT NULL OR
  metadata->>'boundaryStatus' IN ('not_available', 'pending')
);

CREATE TABLE geo.source_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  release_id uuid NOT NULL,
  name text NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  record_count integer NOT NULL CHECK (record_count > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT geo_source_artifact_release_fk FOREIGN KEY (release_id, tenant_id)
    REFERENCES geo.releases(id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT geo_source_artifact_name_unique UNIQUE (release_id, name)
);

ALTER TABLE geo.source_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo.source_artifacts FORCE ROW LEVEL SECURITY;
CREATE POLICY source_artifacts_tenant_isolation ON geo.source_artifacts
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE INDEX geo_places_release_boundary_gist_idx
  ON geo.places USING gist (release_id, boundary) WHERE boundary IS NOT NULL;
CREATE INDEX geo_places_release_center_gist_idx
  ON geo.places USING gist (release_id, center) WHERE center IS NOT NULL;
CREATE INDEX geo_places_bbox_gist_idx
  ON geo.places USING gist (bbox) WHERE bbox IS NOT NULL;
CREATE INDEX geo_places_hierarchy_lookup_idx
  ON geo.places (release_id, type, parent_id, name) WHERE is_active;

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
  input_valid boolean;
BEGIN
  IF NEW.boundary IS NOT NULL THEN
    input_valid := ST_IsValid(NEW.boundary);
    NEW.boundary := ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Force2D(NEW.boundary)), 3));
    IF ST_IsEmpty(NEW.boundary) OR NOT ST_IsValid(NEW.boundary) THEN
      RAISE EXCEPTION 'place boundary is empty or invalid after repair';
    END IF;
    NEW.metadata := NEW.metadata || jsonb_build_object('geometryRepaired', NOT input_valid);
    NEW.boundary_simplified := ST_Multi(ST_SimplifyPreserveTopology(NEW.boundary, 0.0001));
    NEW.bbox := ST_Envelope(NEW.boundary);
    IF NEW.center IS NULL THEN NEW.center := ST_PointOnSurface(NEW.boundary)::geography; END IF;
  ELSE
    NEW.boundary_simplified := NULL;
    NEW.bbox := NULL;
    IF NEW.type = 'neighborhood' AND COALESCE(NEW.metadata->>'boundaryStatus', '') NOT IN ('not_available', 'pending') THEN
      RAISE EXCEPTION 'neighborhood boundary or explicit availability status is required';
    END IF;
  END IF;

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
    WHEN 'city' THEN parent_type IN ('province', 'county', 'district')
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
