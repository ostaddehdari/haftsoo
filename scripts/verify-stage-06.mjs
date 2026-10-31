import { existsSync, readFileSync, readdirSync } from "node:fs";

const required = [
  "database/conventions.json", "database/ownership.json", "database/query-budget.json", "database/partition-policy.json",
  "database/migrations/000001_platform_baseline.up.sql", "database/migrations/000001_platform_baseline.down.sql",
  "database/migrations/000002_transactional_messaging.up.sql", "database/migrations/000002_transactional_messaging.down.sql",
  "apps/api/src/database/database-core.ts", "apps/api/src/database/database.module.ts", "apps/api/test/database-core.test.mjs",
  "scripts/db-migrate.mjs", "scripts/database-contract.mjs", "scripts/build-stage-06.sh", "scripts/recovery-drill.sh",
  "docs/stage-06/data-conventions.md", "docs/stage-06/postgis-extensions.md", "docs/stage-06/schema-ownership.md",
  "docs/stage-06/migrations-rollback.md", "docs/stage-06/repository-uow.md", "docs/stage-06/outbox-inbox.md",
  "docs/stage-06/partition-archive.md", "docs/stage-06/index-query-budget.md",
  "docs/stage-06/backup-restore-drill.md", "docs/stage-06/acceptance.md"
];
const fail = (message) => { throw new Error(`[stage-06] ${message}`); };
const read = (file) => readFileSync(file, "utf8");
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);

const state = JSON.parse(read("project.state.json"));
const design = JSON.parse(read("project.design.json"));
const stage = state.completedStages?.find((entry) => entry.id === "S06");
const works = stage?.works ?? [];
if (state.stageStatus !== "complete") fail("project state must be complete");
if (stage?.status !== "complete" || works.length !== 10 || works.some((work) => work.status !== "complete")) fail("S06 must have exactly 10 completed works");
if (works.some((work, index) => work.id !== `S06-W${String(index + 1).padStart(2, "0")}`)) fail("S06 work identifiers are not sequential");
for (const work of works) if (!existsSync(work.evidence)) fail(`missing evidence for ${work.id}: ${work.evidence}`);
const deliveryStage = Number(design.delivery.currentStage?.slice(1));
const engineeringMinor = Number(design.engineering.version?.split(".")[1]);
if (deliveryStage < 6 || engineeringMinor < 6) fail("design manifest predates S06");

const conventions = JSON.parse(read("database/conventions.json"));
const ownership = JSON.parse(read("database/ownership.json"));
const budget = JSON.parse(read("database/query-budget.json"));
if (conventions.spatial.srid !== 4326 || conventions.time.storageType !== "timestamptz") fail("spatial/time conventions are incomplete");
if (ownership.schemas.length !== 9 || new Set(ownership.schemas.map((entry) => entry.name)).size !== 9) fail("nine unique owned schemas are required");
if (budget.interactive.p95Ms > 200 || budget.defaultStatementTimeoutMs > 1000) fail("interactive query budget regressed");

const migrations = readdirSync("database/migrations");
const up = migrations.filter((file) => file.endsWith(".up.sql"));
const down = migrations.filter((file) => file.endsWith(".down.sql"));
if (up.length !== down.length || up.length < 2) fail("reversible migration pairs are required");
const databaseCore = read("apps/api/src/database/database-core.ts");
if (!databaseCore.includes("ROLLBACK") || !databaseCore.includes("app.current_tenant_id") || !databaseCore.includes("ON CONFLICT")) fail("UoW/outbox/inbox implementation is incomplete");
const workflow = read(".github/workflows/verify.yml");
if (!workflow.includes("npm run database:contract") || !workflow.includes("scripts/recovery-drill.sh")) fail("database CI gates are absent");

console.log(`Stage 06 verified: ${works.length} works, reversible schema baseline, PostGIS, tenant UoW, outbox/inbox and restore drill.`);
