import { existsSync, readFileSync } from "node:fs";

const required = [
  "infra/environments/development.json", "infra/environments/staging.json", "infra/environments/production.json",
  "infra/ansible/site.yml", "infra/ansible/group_vars/all.yml", "infra/ansible/templates/haftsoo-stack.service.j2",
  "ops/registry/images.json", "ops/compose/staging.yaml", "ops/compose/staging.env.example",
  "ops/secrets/README.md", "scripts/manage-secrets.sh", "scripts/test-secrets.sh",
  "ops/edge/policy.json", "ops/nginx/haftsoo-security.conf.example",
  "ops/backup/retention.json", "scripts/backup-postgres.sh", "scripts/recovery-drill.sh",
  "ops/capacity/model.json", "scripts/capacity-plan.mjs", "scripts/test-capacity.mjs",
  ".github/workflows/publish-images.yml",
  "docs/stage-04/topology.md", "docs/stage-04/infrastructure-as-code.md",
  "docs/stage-04/registry-orchestration.md", "docs/stage-04/postgres-postgis.md",
  "docs/stage-04/platform-services.md", "docs/stage-04/secrets-rotation.md",
  "docs/stage-04/edge-security.md", "docs/stage-04/backup-pitr-retention.md",
  "docs/stage-04/capacity-cost-scaling.md", "docs/stage-04/acceptance.md"
];

const fail = (message) => { throw new Error(`[stage-04] ${message}`); };
const read = (file) => readFileSync(file, "utf8");
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);

const state = JSON.parse(read("project.state.json"));
const design = JSON.parse(read("project.design.json"));
const production = JSON.parse(read("infra/environments/production.json"));
const registry = JSON.parse(read("ops/registry/images.json"));
const retention = JSON.parse(read("ops/backup/retention.json"));
const stage = state.completedStages?.find((entry) => entry.id === "S04");
const works = stage?.works ?? [];

if (state.currentStage !== "S04" || state.stageStatus !== "complete") fail("project state must close S04");
if (works.length !== 10 || works.some((work) => work.status !== "complete")) fail("S04 must have exactly 10 completed works");
if (works.some((work, index) => work.id !== `S04-W${String(index + 1).padStart(2, "0")}`)) fail("S04 work identifiers are not sequential");
for (const work of works) if (!existsSync(work.evidence)) fail(`missing evidence for ${work.id}: ${work.evidence}`);

if (design.delivery.currentStage !== "S04") fail("design manifest does not reference S04");
if (!production.data.postgres.includes("managed")) fail("production PostGIS must be managed");
if (!production.backup.pitr) fail("production PITR must be enabled");
if (registry.images.length !== 3 || registry.mutableTagsAllowedForDeployment) fail("registry policy must define three immutable deployables");
if (retention.rpoMinutes > 15 || retention.rtoMinutes > 60) fail("recovery objectives exceed the approved budget");

const compose = read("ops/compose/staging.yaml");
for (const service of ["web", "api", "chat", "postgres", "redis", "kafka", "opensearch", "minio"]) {
  if (!compose.includes(`  ${service}:`)) fail(`staging service absent: ${service}`);
}
if (!compose.includes("internal: true")) fail("data network must be internal");
if (!read(".github/workflows/verify.yml").includes("recovery-drill.sh")) fail("CI recovery drill is absent");
const publishWorkflow = read(".github/workflows/publish-images.yml");
if (!publishWorkflow.includes("provenance: mode=max")) fail("image provenance is absent");
if (!publishWorkflow.includes("cosign sign --yes")) fail("immutable image signature is absent");

console.log(`Stage 04 verified: ${works.length} works, immutable images, isolated data plane, recovery and capacity gates.`);
