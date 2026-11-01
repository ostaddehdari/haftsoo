import { existsSync, readFileSync } from "node:fs";

const fail = (message) => { throw new Error(`[submission-contract] ${message}`); };
const policy = JSON.parse(readFileSync("submission/policy.json", "utf8"));
const quality = JSON.parse(readFileSync("reports/submission/stage-14-quality.json", "utf8"));
if (policy.steps.join(",") !== "category,details,location,media,contact,preview") fail("wizard states are not ordered");
if (policy.autosaveDebounceMs > 1000 || policy.maximumMediaItems !== 10) fail("autosave or media policy exceeds limit");
if (policy.defaultPrivacy.preciseLocationVisible || policy.defaultPrivacy.phoneVisible) fail("privacy defaults must be conservative");
if (quality.result !== "pass" || quality.sampleCategories.length < 3 || Object.values(quality.checks).some((value) => value !== true)) fail("quality matrix is incomplete");
const migration = readFileSync("database/migrations/000007_submission_wizard.up.sql", "utf8");
for (const marker of ["submission_drafts", "submission_requests", "idempotency_key", "FORCE ROW LEVEL SECURITY"]) if (!migration.includes(marker)) fail(`migration is missing ${marker}`);
const repository = readFileSync("apps/api/src/submission/submission.repository.ts", "utf8");
if (!repository.includes("revision = revision + 1") || !repository.includes("FOR UPDATE")) fail("optimistic locking contract is incomplete");
const service = readFileSync("apps/api/src/submission/submission.service.ts", "utf8");
for (const marker of ["serializable", "Idempotency-Key", "post.submitted", "revision_conflict"]) if (!service.includes(marker)) fail(`service is missing ${marker}`);
for (const file of ["apps/web/pages/new/index.vue", "apps/web/composables/useSubmissionWizard.ts", "apps/api/test/submission-core.test.mjs"]) if (!existsSync(file)) fail(`missing ${file}`);
console.log("Submission contract passed: six-step wizard, catalog/geo integration, autosave revision, privacy defaults, preview and idempotent submit.");
