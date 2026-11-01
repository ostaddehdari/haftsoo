import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";

const moduleUrl = pathToFileURL(new URL("../dist/search/map-view-core.js", import.meta.url).pathname);
const { buildViewportQuery, cameraHash, geotilePrecision, mapBucketsToClusters, validateCamera } = await import(moduleUrl);
const camera = { bbox: { minLongitude: 51.55, minLatitude: 32.55, maxLongitude: 51.82, maxLatitude: 32.78 }, zoom: 11.5 };

test("camera validation accepts Isfahan and rejects invalid or oversized bounds", () => {
  assert.deepEqual(validateCamera(camera), camera);
  assert.throws(() => validateCamera({ ...camera, bbox: { ...camera.bbox, minLongitude: 70 } }), /outside Iran|invalid axis/);
  assert.throws(() => validateCamera({ ...camera, zoom: 2 }), /zoom/);
});

test("viewport DSL combines tenant, text filters and geo bounding box", () => {
  const query = buildViewportQuery({ camera, search: { query: "آپارتمان", categorySlug: "real-estate", cityIds: ["4"] } }, "tenant-a");
  const serialized = JSON.stringify(query);
  assert.match(serialized, /geo_bounding_box/);
  assert.match(serialized, /geotile_grid/);
  assert.match(serialized, /tenant-a/);
  assert.equal(query.size, 0);
});

test("camera hash is stable within coordinate precision", () => {
  const first = cameraHash(camera);
  const second = cameraHash({ ...camera, zoom: 11.501, bbox: { ...camera.bbox, minLongitude: 51.550001 } });
  assert.equal(first, second);
  assert.equal(first.length, 20);
});

test("cluster precision follows zoom and bucket parser carries preview", () => {
  assert.equal(geotilePrecision(4), 5);
  assert.equal(geotilePrecision(18), 16);
  const clusters = mapBucketsToClusters([{ key: "11/1/2", doc_count: 7, center: { location: { lat: 32.65, lon: 51.67 } }, preview: { hits: { hits: [{ _id: "p1", _source: { title_display: "خانه" } }] } } }], 11);
  assert.equal(clusters[0].count, 7);
  assert.equal(clusters[0].preview.id, "p1");
  assert.equal(mapBucketsToClusters([{ key: "bad", doc_count: 1 }], 11).length, 0);
});
