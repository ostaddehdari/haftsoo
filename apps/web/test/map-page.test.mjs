import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("listing map provides MapLibre, markers, clusters and neighborhood boundaries", async () => {
  const map = await readFile(new URL("../components/ClassifiedsMap.client.vue", import.meta.url), "utf8");
  assert.match(map, /maplibre-gl/);
  assert.match(map, /clusterRadius/);
  assert.match(map, /server-clusters/);
  assert.match(map, /neighborhood-outline/);
  assert.match(map, /getClusterExpansionZoom/);
  assert.match(map, /AttributionControl/);
});

test("map and list share route state and viewport API", async () => {
  const page = await readFile(new URL("../pages/s/[city]/[[category]].vue", import.meta.url), "utf8");
  const search = await readFile(new URL("../composables/useMapSearch.ts", import.meta.url), "utf8");
  assert.match(page, /mapMode/);
  assert.match(page, /selectedDistricts/);
  assert.match(page, /MapPostPreview/);
  assert.match(search, /map\/viewport/);
  assert.match(search, /map_bbox/);
  assert.match(search, /300/);
});

test("installable static shell exposes map mode and marker preview", async () => {
  const html = await readFile(new URL("../../../deploy/web/index.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../../../deploy/web/app.js", import.meta.url), "utf8");
  assert.match(html, /id="static-map"/);
  assert.match(html, /OpenStreetMap contributors/);
  assert.match(script, /static-map-toggle/);
  assert.match(script, /renderStaticMap/);
});
