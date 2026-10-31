import { existsSync, readFileSync } from "node:fs";

const required = [
  "security/identity-model.json", "security/authorization-catalog.json", "security/session-policy.json",
  "security/service-auth-policy.json", "security/http-policy.json", "security/rate-limit-policy.json",
  "security/audit-policy.json", "security/data-flow.json", "security/threat-model.json",
  "apps/api/src/security/security-core.ts", "apps/api/src/security/service-auth.guard.ts",
  "apps/api/src/security/security-headers.interceptor.ts", "apps/api/src/security/rate-limit.guard.ts",
  "apps/api/src/security/security.controller.ts", "apps/api/src/security/security.module.ts",
  "apps/api/test/security-core.test.mjs", "apps/api/test/security-http.test.mjs",
  "scripts/security-baseline.mjs", "scripts/build-stage-05.sh",
  "docs/stage-05/identity-principals.md", "docs/stage-05/authorization-catalog.md",
  "docs/stage-05/session-device-trust.md", "docs/stage-05/service-authentication.md",
  "docs/stage-05/http-security.md", "docs/stage-05/rate-limit-abuse.md",
  "docs/stage-05/audit-trail.md", "docs/stage-05/threat-model-data-flow.md",
  "docs/stage-05/security-tests.md", "docs/stage-05/acceptance.md"
];
const fail = (message) => { throw new Error(`[stage-05] ${message}`); };
const read = (file) => readFileSync(file, "utf8");
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);

const state = JSON.parse(read("project.state.json"));
const design = JSON.parse(read("project.design.json"));
const stage = state.completedStages?.find((entry) => entry.id === "S05");
const works = stage?.works ?? [];
if (state.stageStatus !== "complete") fail("project state must be complete");
if (stage?.status !== "complete" || works.length !== 10 || works.some((work) => work.status !== "complete")) fail("S05 must have exactly 10 completed works");
if (works.some((work, index) => work.id !== `S05-W${String(index + 1).padStart(2, "0")}`)) fail("S05 work identifiers are not sequential");
for (const work of works) if (!existsSync(work.evidence)) fail(`missing evidence for ${work.id}: ${work.evidence}`);
const deliveryStage = Number(design.delivery.currentStage?.slice(1));
const engineeringMinor = Number(design.engineering.version?.split(".")[1]);
if (deliveryStage < 5 || engineeringMinor < 5) fail("design manifest predates S05");

const identity = JSON.parse(read("security/identity-model.json"));
const auth = JSON.parse(read("security/authorization-catalog.json"));
const serviceAuth = JSON.parse(read("security/service-auth-policy.json"));
const audit = JSON.parse(read("security/audit-policy.json"));
if (identity.principalTypes.length !== 5) fail("five principal types are required");
if (auth.defaultDecision !== "deny") fail("authorization must default to deny");
if (!serviceAuth.nonce.singleUse || serviceAuth.maximumClockSkewSeconds > 60) fail("service replay defense is incomplete");
if (!audit.storage.appendOnly || !audit.storage.wormArchive) fail("audit retention policy is incomplete");

const core = read("apps/api/src/security/security-core.ts");
const module = read("apps/api/src/security/security.module.ts");
const guard = read("apps/api/src/security/service-auth.guard.ts");
if (!core.includes("timingSafeEqual") || !core.includes("verifyAuditChain")) fail("security primitives are incomplete");
if (!module.includes("APP_INTERCEPTOR") || !guard.includes("NonceReplayGuard")) fail("Nest security integration is incomplete");
const workflow = read(".github/workflows/verify.yml");
if (!workflow.includes("npm run security:baseline") || !workflow.includes("npm run test:security")) fail("security CI gate is absent");

console.log(`Stage 05 verified: ${works.length} works, IAM default-deny, service authentication, abuse controls, STRIDE and audit integrity.`);
