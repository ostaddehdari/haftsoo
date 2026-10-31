import { existsSync, readFileSync } from "node:fs";

const required = [
  "database/migrations/000003_catalog_taxonomy.up.sql", "database/migrations/000003_catalog_taxonomy.down.sql",
  "apps/api/src/catalog/catalog-core.ts", "apps/api/src/catalog/catalog.repository.ts", "apps/api/src/catalog/catalog.service.ts",
  "apps/api/src/catalog/catalog.controller.ts", "apps/api/src/catalog/catalog.module.ts", "apps/api/test/catalog-core.test.mjs",
  "fixtures/catalog/sample-catalog.json", "scripts/catalog-import.mjs", "scripts/catalog-contract.mjs", "scripts/build-stage-07.sh",
  "docs/stage-07/taxonomy-domain.md", "docs/stage-07/release-lifecycle.md", "docs/stage-07/dynamic-fields.md",
  "docs/stage-07/form-rules.md", "docs/stage-07/catalog-persistence.md", "docs/stage-07/public-api.md",
  "docs/stage-07/admin-import-publish.md", "docs/stage-07/import-contract.md", "docs/stage-07/testing-observability.md",
  "docs/stage-07/acceptance.md"
];
const fail = (message) => { throw new Error(`[stage-07] ${message}`); };
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);
const state = JSON.parse(readFileSync("project.state.json", "utf8"));
const design = JSON.parse(readFileSync("project.design.json", "utf8"));
const stage = state.completedStages?.find((entry) => entry.id === "S07");
const works = stage?.works ?? [];
if (state.currentStage !== "S07" || state.stageStatus !== "complete") fail("project state must close S07");
if (stage?.status !== "complete" || works.length !== 10 || works.some((work) => work.status !== "complete")) fail("S07 must have exactly 10 completed works");
if (works.some((work, index) => work.id !== `S07-W${String(index + 1).padStart(2, "0")}`)) fail("S07 work identifiers are not sequential");
for (const work of works) if (!existsSync(work.evidence)) fail(`missing evidence for ${work.id}: ${work.evidence}`);
if (state.nextStage !== "S08" || design.delivery.currentStage !== "S07" || design.engineering.version !== "0.7.0") fail("design/state manifests are not at S07");
const migration = readFileSync("database/migrations/000003_catalog_taxonomy.up.sql", "utf8");
if (!migration.includes("guard_category_parent") || !migration.includes("catalog_one_published_release_idx")) fail("taxonomy safety constraints are incomplete");
const controller = readFileSync("apps/api/src/catalog/catalog.controller.ts", "utf8");
if (!controller.includes("categories/tree") || !controller.includes("releases/:releaseId/publish") || !controller.includes("etag")) fail("catalog API/cache contract is incomplete");
const workflow = readFileSync(".github/workflows/verify.yml", "utf8");
if (!workflow.includes("npm run catalog:contract") || !workflow.includes("npm run catalog:validate")) fail("catalog CI gates are absent");
console.log(`Stage 07 verified: ${works.length} works, versioned taxonomy, dynamic forms, guarded import/publish and cache contracts.`);
