import { existsSync, readFileSync } from "node:fs";

const fail = (message) => { throw new Error(`[geo-contract] ${message}`); };
const required = [
  "database/migrations/000004_geo_places.up.sql", "database/migrations/000004_geo_places.down.sql",
  "apps/api/src/geo/geo-core.ts", "apps/api/src/geo/geo.repository.ts", "apps/api/src/geo/geo.service.ts",
  "apps/api/src/geo/geo.controller.ts", "apps/api/src/geo/geo.module.ts", "apps/api/test/geo-core.test.mjs",
  "fixtures/geo/sample-geo.json", "scripts/geo-import.mjs"
];
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);
const migration = readFileSync(required[0], "utf8");
for (const table of ["releases", "places", "place_identifiers", "import_jobs"]) {
  if (!migration.includes(`CREATE TABLE geo.${table}`)) fail(`missing geo.${table}`);
}
for (const contract of ["geometry(MultiPolygon, 4326)", "geography(Point, 4326)", "ST_MakeValid", "ST_SimplifyPreserveTopology", "ST_Envelope", "ST_PointOnSurface", "USING gist", "FORCE ROW LEVEL SECURITY"]) {
  if (!migration.includes(contract)) fail(`missing ${contract}`);
}
const repository = readFileSync("apps/api/src/geo/geo.repository.ts", "utf8");
for (const contract of ["ST_Covers", "ST_Area", "ST_AsGeoJSON", "boundary && point.geometry"]) if (!repository.includes(contract)) fail(`missing query contract ${contract}`);
const controller = readFileSync("apps/api/src/geo/geo.controller.ts", "utf8");
for (const route of ["places/:key/boundary", "search", "resolve", "releases/:releaseId/publish"]) if (!controller.includes(route)) fail(`missing API route ${route}`);
const fixture = JSON.parse(readFileSync("fixtures/geo/sample-geo.json", "utf8"));
if (fixture.schemaVersion !== 1 || fixture.places.length < 6 || !fixture.places.some((place) => place.type === "neighborhood" && place.boundary)) fail("fixture coverage is incomplete");
console.log("Geo contract passed: versioned hierarchy, provider-neutral IDs, WGS84 MultiPolygon, spatial resolution and guarded import/publish APIs.");
