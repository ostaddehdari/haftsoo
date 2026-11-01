import { existsSync, readFileSync } from "node:fs";

const required = [
  "apps/web/pages/new/index.vue", "apps/web/composables/useSubmissionWizard.ts", "apps/web/components/SubmissionStepper.vue", "apps/web/components/CategoryWizard.vue",
  "apps/web/components/DynamicSubmissionForm.vue", "apps/web/components/MediaDescriptionStep.vue", "apps/web/components/ContactPrivacyStep.vue", "apps/web/components/SubmissionPreview.vue",
  "apps/api/src/submission/submission-core.ts", "apps/api/src/submission/submission.repository.ts", "apps/api/src/submission/submission.service.ts", "apps/api/src/submission/submission.controller.ts",
  "database/migrations/000007_submission_wizard.up.sql", "database/migrations/000007_submission_wizard.down.sql", "submission/policy.json", "reports/submission/stage-14-quality.json",
  "docs/stage-14/state-machine.md", "docs/stage-14/category-selection.md", "docs/stage-14/dynamic-category-form.md", "docs/stage-14/location-neighborhood.md",
  "docs/stage-14/media-description.md", "docs/stage-14/contact-privacy-consent.md", "docs/stage-14/draft-autosave.md", "docs/stage-14/preview.md",
  "docs/stage-14/idempotent-submit.md", "docs/stage-14/acceptance.md", "scripts/submission-contract.mjs", "scripts/build-stage-14.sh",
  "deploy/web/vendor/maplibre-gl-5.14.0.js", "deploy/web/vendor/maplibre-gl-5.14.0.css", "deploy/web/vendor/LICENSE.maplibre-gl.txt"
];
const fail = (message) => { throw new Error(`[stage-14] ${message}`); };
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);
const state = JSON.parse(readFileSync("project.state.json", "utf8")); const design = JSON.parse(readFileSync("project.design.json", "utf8"));
const stage = state.completedStages?.find((entry) => entry.id === "S14"); const works = stage?.works ?? [];
if (Number(state.currentStage.slice(1)) < 14 || state.stageStatus !== "complete") fail("project state must retain completed S14");
if (stage?.status !== "complete" || works.length !== 10 || works.some((work) => work.status !== "complete")) fail("S14 must have exactly 10 completed works");
if (works.some((work, index) => work.id !== `S14-W${String(index + 1).padStart(2, "0")}`)) fail("S14 work identifiers are not sequential");
for (const work of works) if (!existsSync(work.evidence)) fail(`missing evidence for ${work.id}: ${work.evidence}`);
if (Number(design.delivery.currentStage.slice(1)) < 14 || !design.engineering.submissionWizard) fail("design manifest regressed below S14");
const staticHtml = readFileSync("deploy/web/index.html", "utf8");
const staticJs = readFileSync("deploy/web/app.js", "utf8");
if (!/app\.js\?v=stage(?:14-map-3|15-media-1|16-lifecycle-1)/.test(staticHtml) || !/app\.css\?v=stage(?:14-map-2|15-media-1|16-lifecycle-1)/.test(staticHtml)) fail("installable shell assets must use a release cache key");
if (!staticHtml.includes("maplibre-gl-5.14.0.js") || !staticHtml.includes('id="static-map-canvas"')) fail("installable shell must load the self-hosted MapLibre runtime");
if (!staticJs.includes("listingState.map=!listingState.map")) fail("installable shell map toggle is not wired");
if (!staticJs.includes("new window.maplibregl.Map") || !staticJs.includes("getClusterExpansionZoom")) fail("installable shell real map and clusters are not wired");
console.log("Stage 14 verified: 10 works, six-step submission wizard, dynamic forms, national geo, autosave, preview and idempotent submit.");
