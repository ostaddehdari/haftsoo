import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const directory = "database/migrations";
const fail = (message) => { throw new Error(`[database-contract] ${message}`); };
const up = readdirSync(directory).filter((file) => file.endsWith(".up.sql")).sort();
const down = readdirSync(directory).filter((file) => file.endsWith(".down.sql")).sort();
if (up.length < 2 || up.length !== down.length) fail("up/down migrations must be paired");
for (const file of up) {
  const version = file.split("_")[0];
  if (!down.some((candidate) => candidate.startsWith(`${version}_`))) fail(`missing rollback for ${file}`);
  const digest = createHash("sha256").update(readFileSync(`${directory}/${file}`)).digest("hex");
  if (!/^[a-f0-9]{64}$/.test(digest)) fail(`invalid checksum for ${file}`);
}

const baseline = readFileSync(`${directory}/${up[0]}`, "utf8");
const messaging = readFileSync(`${directory}/${up[1]}`, "utf8");
for (const extension of ["postgis", "pgcrypto", "citext", "btree_gist"]) {
  if (!baseline.includes(`EXTENSION IF NOT EXISTS ${extension}`)) fail(`missing extension ${extension}`);
}
for (const schema of ["platform", "identity", "catalog", "geo", "listing", "messaging", "finance", "moderation", "audit"]) {
  if (!baseline.includes(`SCHEMA IF NOT EXISTS ${schema}`)) fail(`missing schema ${schema}`);
}
if (!baseline.includes("FORCE ROW LEVEL SECURITY") || !baseline.includes("app.current_tenant_id")) fail("tenant RLS contract is incomplete");
if (!messaging.includes("PARTITION BY RANGE") || !messaging.includes("outbox_unpublished_idx")) fail("outbox partition/index contract is incomplete");
if (!messaging.includes("ON platform.inbox_receipts") || !messaging.includes("archive_manifest")) fail("inbox/archive contract is incomplete");

for (const file of ["database/conventions.json", "database/ownership.json", "database/query-budget.json", "database/partition-policy.json"]) {
  if (!existsSync(file)) fail(`missing ${file}`);
  JSON.parse(readFileSync(file, "utf8"));
}
console.log(`Database contract passed: ${up.length} reversible migrations, PostGIS, tenant RLS, outbox/inbox and query budgets.`);
