import { readFileSync } from "node:fs";

const fail = (message) => { throw new Error(`[search-contract] ${message}`); };
const template = JSON.parse(readFileSync("search/opensearch/posts-v1.json", "utf8"));
const sla = JSON.parse(readFileSync("search/sla.json", "utf8"));
const mapping = template.template?.mappings?.properties ?? {};
for (const field of ["tenant_id", "title", "description", "category_slug", "city_id", "district_id", "price", "attributes", "status", "published_at", "location", "quality_score"]) {
  if (!mapping[field]) fail(`mapping is missing ${field}`);
}
if (template.template.mappings.dynamic !== "strict") fail("index mapping must reject undeclared root fields");
for (const analyzer of ["haftsoo_fa", "haftsoo_fa_shingle", "haftsoo_autocomplete"]) {
  if (!template.template.settings.analysis.analyzer[analyzer]) fail(`missing analyzer ${analyzer}`);
}
if (!template.template.aliases["haftsoo-posts-read"] || !template.template.aliases["haftsoo-posts-write"]?.is_write_index) fail("read/write aliases are incomplete");
if (sla.targets.latencyP95Ms > 250 || sla.targets.indexFreshnessP95Seconds > 30 || sla.targets.normalizedDcgAt10Min < 0.75) fail("SLA targets are below the release gate");
const migration = readFileSync("database/migrations/000006_search_saved_alerts.up.sql", "utf8");
for (const marker of ["saved_searches", "alert_deliveries", "idempotency_key", "ENABLE ROW LEVEL SECURITY", "index_checkpoints"]) if (!migration.includes(marker)) fail(`search persistence is missing ${marker}`);
const core = readFileSync("apps/api/src/search/search-core.ts", "utf8");
for (const marker of ["normalizePersian", "function_score", "search_after", "match_phrase_prefix", "attributes."]) if (!core.includes(marker)) fail(`search core is missing ${marker}`);
console.log("Search contract passed: strict Persian index, aliases, dynamic filters, cursor pagination, alerts and SLA budgets.");
