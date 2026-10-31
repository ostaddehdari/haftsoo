DROP TABLE IF EXISTS geo.import_jobs;
DROP TABLE IF EXISTS geo.place_identifiers;
DROP TRIGGER IF EXISTS geo_places_touch_updated_at ON geo.places;
DROP TRIGGER IF EXISTS geo_places_guard ON geo.places;
DROP FUNCTION IF EXISTS geo.guard_place();
DROP TABLE IF EXISTS geo.places;
DROP TABLE IF EXISTS geo.releases;
