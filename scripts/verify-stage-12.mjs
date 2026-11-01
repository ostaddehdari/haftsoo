import { existsSync, readFileSync } from "node:fs";

const required = [
  "search/opensearch/posts-v1.json", "search/sla.json", "search/relevance-fixture.json",
  "apps/api/src/search/search-core.ts", "apps/api/src/search/opensearch.client.ts", "apps/api/src/search/index-sync.worker.ts",
  "apps/api/src/search/search.repository.ts", "apps/api/src/search/search.service.ts", "apps/api/src/search/search.controller.ts",
  "apps/api/src/search/search.module.ts", "apps/api/test/search-core.test.mjs", "apps/api/test/search-sync.test.mjs",
  "database/migrations/000006_search_saved_alerts.up.sql", "database/migrations/000006_search_saved_alerts.down.sql",
  "scripts/opensearch-bootstrap.mjs", "scripts/search-contract.mjs", "scripts/search-relevance-performance.mjs", "scripts/build-stage-12.sh",
  "docs/stage-12/index-mapping.md", "docs/stage-12/index-sync-pipeline.md", "docs/stage-12/persian-normalization.md",
  "docs/stage-12/query-dsl.md", "docs/stage-12/dynamic-filters.md", "docs/stage-12/suggestions.md",
  "docs/stage-12/ranking-freshness.md", "docs/stage-12/saved-search-alerts.md", "docs/stage-12/relevance-performance.md",
  "docs/stage-12/acceptance.md"
];
const fail = (message) => { throw new Error(`[stage-12] ${message}`); };
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);
const state = JSON.parse(readFileSync("project.state.json", "utf8"));
const design = JSON.parse(readFileSync("project.design.json", "utf8"));
const stage = state.completedStages?.find((entry) => entry.id === "S12");
const works = stage?.works ?? [];
if (state.currentStage !== "S12" || state.stageStatus !== "complete" || state.nextStage !== "S13") fail("project state must close S12 and point to S13");
if (stage?.status !== "complete" || works.length !== 10 || works.some((work) => work.status !== "complete")) fail("S12 must have exactly 10 completed works");
if (works.some((work, index) => work.id !== `S12-W${String(index + 1).padStart(2, "0")}`)) fail("S12 work identifiers are not sequential");
for (const work of works) if (!existsSync(work.evidence)) fail(`missing evidence for ${work.id}: ${work.evidence}`);
if (design.delivery.currentStage !== "S12" || design.engineering.version !== "0.12.0" || design.architecture.search !== "OpenSearch") fail("design manifest is not at S12");
const workflow = readFileSync(".github/workflows/verify.yml", "utf8");
if (!workflow.includes("search:contract") || !workflow.includes("search:quality")) fail("search CI gates are absent");
const compose = readFileSync("compose.dev.yaml", "utf8");
if (!compose.includes("opensearchproject/opensearch:3.2.0") || !compose.includes("OPENSEARCH_URL")) fail("development OpenSearch topology is absent");
console.log("Stage 12 verified: 10 works, Persian OpenSearch, index sync, safe DSL, dynamic filters, suggestions, ranking, saved alerts and SLA gates.");
