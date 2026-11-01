import { existsSync, readFileSync } from "node:fs";

const required = [
  "apps/web/components/ClassifiedsMap.client.vue", "apps/web/components/MapPostPreview.vue", "apps/web/composables/useMapSearch.ts", "apps/web/public/maps/style.json",
  "apps/api/src/search/map-view-core.ts", "apps/api/src/search/map-view.controller.ts", "apps/api/src/search/map-view.service.ts", "apps/api/test/map-view-core.test.mjs",
  "maps/performance-budget.json", "reports/map/stage-13-quality.json", "scripts/map-gis-contract.mjs", "scripts/build-stage-13.sh",
  "docs/stage-13/maplibre-setup.md", "docs/stage-13/style-tile-attribution.md", "docs/stage-13/viewport-camera-api.md", "docs/stage-13/post-clustering.md",
  "docs/stage-13/bounding-box-search.md", "docs/stage-13/neighborhood-polygons.md", "docs/stage-13/markers-preview.md", "docs/stage-13/map-list-sync.md",
  "docs/stage-13/spatial-performance.md", "docs/stage-13/acceptance.md"
];
const fail = (message) => { throw new Error(`[stage-13] ${message}`); };
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);
const state = JSON.parse(readFileSync("project.state.json", "utf8"));
const design = JSON.parse(readFileSync("project.design.json", "utf8"));
const stage = state.completedStages?.find((entry) => entry.id === "S13");
const works = stage?.works ?? [];
if (state.currentStage !== "S13" || state.stageStatus !== "complete" || state.nextStage !== "S14") fail("project state must close S13 and point to S14");
if (stage?.status !== "complete" || works.length !== 10 || works.some((work) => work.status !== "complete")) fail("S13 must have exactly 10 completed works");
if (works.some((work, index) => work.id !== `S13-W${String(index + 1).padStart(2, "0")}`)) fail("S13 work identifiers are not sequential");
for (const work of works) if (!existsSync(work.evidence)) fail(`missing evidence for ${work.id}: ${work.evidence}`);
if (design.delivery.currentStage !== "S13" || design.engineering.version !== "0.13.0" || design.architecture.mapEngine !== "MapLibre GL JS") fail("design manifest is not at S13");
const page = readFileSync("apps/web/pages/s/[city]/[[category]].vue", "utf8");
if (!page.includes("ClassifiedsMap") || !page.includes("MapPostPreview") || !page.includes("mapMode")) fail("map/list product flow is absent");
console.log("Stage 13 verified: 10 works, MapLibre, viewport clusters, bbox search, polygons, previews, map/list sync and four-city zoom gate.");
