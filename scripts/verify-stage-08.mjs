import { existsSync, readFileSync } from "node:fs";

const required = [
  "database/migrations/000004_geo_places.up.sql", "database/migrations/000004_geo_places.down.sql",
  "apps/api/src/geo/geo-core.ts", "apps/api/src/geo/geo.repository.ts", "apps/api/src/geo/geo.service.ts",
  "apps/api/src/geo/geo.controller.ts", "apps/api/src/geo/geo.module.ts", "apps/api/test/geo-core.test.mjs",
  "fixtures/geo/sample-geo.json", "scripts/geo-import.mjs", "scripts/geo-contract.mjs", "scripts/build-stage-08.sh",
  "docs/stage-08/hierarchy-domain.md", "docs/stage-08/release-lifecycle.md", "docs/stage-08/geometry-quality.md",
  "docs/stage-08/import-contract.md", "docs/stage-08/spatial-persistence.md", "docs/stage-08/public-api.md",
  "docs/stage-08/resolve-search.md", "docs/stage-08/admin-import-publish.md", "docs/stage-08/testing-observability.md",
  "docs/stage-08/acceptance.md"
];
const fail = (message) => { throw new Error(`[stage-08] ${message}`); };
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);
const state = JSON.parse(readFileSync("project.state.json", "utf8"));
const design = JSON.parse(readFileSync("project.design.json", "utf8"));
const stage = state.completedStages?.find((entry) => entry.id === "S08");
const works = stage?.works ?? [];
if (state.currentStage !== "S08" || state.stageStatus !== "complete") fail("project state must close S08");
if (stage?.status !== "complete" || works.length !== 10 || works.some((work) => work.status !== "complete")) fail("S08 must have exactly 10 completed works");
if (works.some((work, index) => work.id !== `S08-W${String(index + 1).padStart(2, "0")}`)) fail("S08 work identifiers are not sequential");
for (const work of works) if (!existsSync(work.evidence)) fail(`missing evidence for ${work.id}: ${work.evidence}`);
if (state.nextStage !== "S09" || design.delivery.currentStage !== "S08" || design.engineering.version !== "0.8.0") fail("design/state manifests are not at S08");
const workflow = readFileSync(".github/workflows/verify.yml", "utf8");
if (!workflow.includes("npm run geo:contract") || !workflow.includes("npm run geo:validate")) fail("geo CI gates are absent");
console.log(`Stage 08 verified: ${works.length} works, provider-neutral Iran hierarchy, validated polygons, PostGIS resolution and publish lifecycle.`);
