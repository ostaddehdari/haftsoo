import { existsSync, readFileSync } from "node:fs";

const fail = (message) => { throw new Error(`[map-contract] ${message}`); };
const budget = JSON.parse(readFileSync("maps/performance-budget.json", "utf8"));
const quality = JSON.parse(readFileSync("reports/map/stage-13-quality.json", "utf8"));
const style = JSON.parse(readFileSync("apps/web/public/maps/style.json", "utf8"));
if (budget.viewportDebounceMs > 350 || budget.maximumClusters > 2000 || budget.viewportApiMsP95 > 500) fail("performance budget exceeds the approved ceiling");
if (budget.qualityCities.length < 4 || budget.qualityZooms.length < 3) fail("multi-city and multi-zoom coverage is incomplete");
if (quality.result !== "pass" || quality.cities.length < 4 || Object.values(quality.checks).some((value) => value !== true)) fail("map quality report is incomplete");
if (style.version !== 8 || !style.sources?.openstreetmap?.attribution?.includes("OpenStreetMap")) fail("style or attribution is invalid");
for (const file of ["apps/web/components/ClassifiedsMap.client.vue", "apps/api/src/search/map-view-core.ts", "apps/api/src/search/map-view.controller.ts"]) if (!existsSync(file)) fail(`missing ${file}`);
console.log("Map/GIS contract passed: MapLibre style, attribution, bounded viewport, clusters, polygons and four-city zoom matrix.");
