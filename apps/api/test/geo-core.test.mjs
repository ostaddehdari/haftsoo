import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = readFileSync(new URL("../src/geo/geo-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleUrl = pathToFileURL(`${process.cwd()}/.geo-core-${process.pid}.mjs`);
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/geo/sample-geo.json", import.meta.url), "utf8"));

test("validates deterministic Iran hierarchy fixture", () => {
  const issues = core.validateGeoImport(fixture);
  assert.deepEqual(issues.filter((issue) => issue.severity === "error"), []);
  assert.match(core.geoChecksum(fixture), /^[a-f0-9]{64}$/);
  assert.equal(core.geoChecksum(fixture), core.geoChecksum(structuredClone(fixture)));
  const tree = core.buildPlaceTree(fixture.places);
  assert.equal(tree[0].key, "iran");
  assert.equal(tree[0].children[0].children[0].children[0].depth, 3);
});

test("normalizes Polygon to MultiPolygon and calculates bbox", () => {
  const boundary = fixture.places.find((place) => place.key === "isfahan-city").boundary;
  assert.equal(core.asMultiPolygon(boundary).type, "MultiPolygon");
  assert.deepEqual(core.geometryBBox(boundary), [51.58, 32.58, 51.76, 32.73]);
});

test("resolves points while respecting polygon holes", () => {
  const geometry = {
    type: "Polygon",
    coordinates: [
      [[51, 32], [52, 32], [52, 33], [51, 33], [51, 32]],
      [[51.4, 32.4], [51.6, 32.4], [51.6, 32.6], [51.4, 32.6], [51.4, 32.4]]
    ]
  };
  assert.equal(core.pointInBoundary([51.2, 32.2], geometry), true);
  assert.equal(core.pointInBoundary([51.5, 32.5], geometry), false);
  assert.equal(core.pointInBoundary([53, 35], geometry), false);
});

test("rejects open rings, bad hierarchy and duplicate provider ids", () => {
  const invalid = structuredClone(fixture);
  invalid.places[1].parentKey = "isfahan-city";
  invalid.places[4].boundary.coordinates[0].pop();
  invalid.places[5].identifiers[0].externalId = "district-east";
  const codes = new Set(core.validateGeoImport(invalid).filter((issue) => issue.severity === "error").map((issue) => issue.code));
  assert.equal(codes.has("place.hierarchy"), true);
  assert.equal(codes.has("place.cycle"), true);
  assert.equal(codes.has("geometry.open_ring"), true);
  assert.equal(codes.has("identifier.duplicate"), true);
});

void moduleUrl;
