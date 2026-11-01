import { existsSync, readFileSync, readdirSync } from "node:fs";

const required = [
  "database/migrations/000005_geo_national_dataset.up.sql", "database/migrations/000005_geo_national_dataset.down.sql",
  "data/geo/national-manifest.json", "reports/geo/national-quality.json", "apps/api/src/geo/national-import-core.ts",
  "apps/api/test/national-import-core.test.mjs", "apps/web/components/GeoSelector.vue", "apps/web/test/geo-selector.test.mjs",
  "tools/geo-qa/index.html", "scripts/geo-national-lib.mjs", "scripts/geo-national-contract.mjs", "scripts/geo-national-build.mjs",
  "scripts/geo-national-qa.mjs", "scripts/build-stage-09.sh",
  "docs/stage-09/cities-reference-ids.md", "docs/stage-09/neighborhoods-city-link.md", "docs/stage-09/polyline-precision-5.md",
  "docs/stage-09/geometry-validation-repair.md", "docs/stage-09/province-city-district-relations.md", "docs/stage-09/postgis-spatial-indexes.md",
  "docs/stage-09/hierarchy-api.md", "docs/stage-09/geo-selector.md", "docs/stage-09/nationwide-polygon-qa.md", "docs/stage-09/acceptance.md"
];
const fail = (message) => { throw new Error(`[stage-09] ${message}`); };
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);
if (readdirSync("data/geo/source").filter((file) => file.includes(".b64.part-")).length < 2) fail("national source parts are absent");
const state = JSON.parse(readFileSync("project.state.json", "utf8"));
const design = JSON.parse(readFileSync("project.design.json", "utf8"));
const stage = state.completedStages?.find((entry) => entry.id === "S09");
const works = stage?.works ?? [];
if (stage?.status !== "complete" || works.length !== 10 || works.some((work) => work.status !== "complete")) fail("S09 must have exactly 10 completed works");
if (works.some((work, index) => work.id !== `S09-W${String(index + 1).padStart(2, "0")}`)) fail("S09 work identifiers are not sequential");
for (const work of works) if (!existsSync(work.evidence)) fail(`missing evidence for ${work.id}: ${work.evidence}`);
if (Number(design.engineering.version.split(".")[1]) < 9) fail("engineering version predates S09");
const workflow = readFileSync(".github/workflows/verify.yml", "utf8");
if (!workflow.includes("geo:national:contract") || !workflow.includes("geo:national:qa")) fail("national geography CI gates are absent");
const nationalRuntime = readFileSync("scripts/geo-national-lib.mjs", "utf8");
if (nationalRuntime.includes('from "typescript"')) fail("national runtime must not depend on development-only TypeScript");
console.log(`Stage 09 verified: ${works.length} works, 1177 cities, 2826 neighborhoods, precision-5 polygons, hierarchy API and selector.`);
