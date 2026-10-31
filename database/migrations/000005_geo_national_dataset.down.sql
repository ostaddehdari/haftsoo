DROP INDEX IF EXISTS geo.geo_places_hierarchy_lookup_idx;
DROP INDEX IF EXISTS geo.geo_places_bbox_gist_idx;
DROP INDEX IF EXISTS geo.geo_places_release_center_gist_idx;
DROP INDEX IF EXISTS geo.geo_places_release_boundary_gist_idx;
DROP TABLE IF EXISTS geo.source_artifacts;

ALTER TABLE geo.places DROP CONSTRAINT IF EXISTS geo_neighborhood_spatial_state;
ALTER TABLE geo.places DROP CONSTRAINT IF EXISTS geo_place_spatial_state;
ALTER TABLE geo.places ADD CONSTRAINT geo_neighborhood_has_boundary CHECK (type <> 'neighborhood' OR boundary IS NOT NULL);
ALTER TABLE geo.places ADD CONSTRAINT geo_center_required CHECK (center IS NOT NULL);

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
    IF ST_IsEmpty(NEW.boundary) OR NOT ST_IsValid(NEW.boundary) THEN RAISE EXCEPTION 'place boundary is empty or invalid'; END IF;
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
  SELECT release_id, tenant_id, type, depth INTO parent_release, parent_tenant, parent_type, parent_depth
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
  WITH RECURSIVE ancestors(id, parent_id) AS (
    SELECT id, parent_id FROM geo.places WHERE id = NEW.parent_id
    UNION ALL SELECT place.id, place.parent_id FROM geo.places place JOIN ancestors ON place.id = ancestors.parent_id
  ) SELECT EXISTS (SELECT 1 FROM ancestors WHERE id = NEW.id) INTO cycle_found;
  IF cycle_found THEN RAISE EXCEPTION 'place hierarchy cycle detected'; END IF;
  RETURN NEW;
END;
$$;
