import { existsSync, readFileSync } from "node:fs";
const fail = message => { throw new Error(`[stage-19] ${message}`); };
const required = [
  "docs/stage-19/profile-account.md", "docs/stage-19/preferences.md", "docs/stage-19/bookmark-collections.md", "docs/stage-19/recent-views.md", "docs/stage-19/saved-searches.md", "docs/stage-19/navigation-overview.md", "docs/stage-19/identity-status.md", "docs/stage-19/consent-privacy.md", "docs/stage-19/export-delete.md", "docs/stage-19/acceptance.md",
  "reports/account/stage-19-quality.json", "scripts/account-contract.mjs", "scripts/build-stage-19.sh", "apps/api/test/account-core.test.mjs", "apps/web/test/account-pages.test.mjs"
];
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);
const state = JSON.parse(readFileSync("project.state.json", "utf8")), design = JSON.parse(readFileSync("project.design.json", "utf8")), stage = state.completedStages?.find(entry => entry.id === "S19"), works = stage?.works ?? [];
if (Number(state.currentStage.slice(1)) < 19 || state.stageStatus !== "complete") fail("project state must retain completed S19");
if (stage?.status !== "complete" || works.length !== 10 || works.some(work => work.status !== "complete")) fail("S19 must have ten completed works");
if (works.some((work, index) => work.id !== `S19-W${String(index + 1).padStart(2, "0")}` || !existsSync(work.evidence))) fail("S19 evidence is incomplete");
if (Number(design.delivery.currentStage.slice(1)) < 19 || !design.engineering.accountPolicy) fail("design manifest regressed below S19");
const html = readFileSync("deploy/web/index.html", "utf8"), js = readFileSync("deploy/web/app.js", "utf8");
for (const marker of ["data-account-panel=\"overview\"", "static-consent-form", "static-export-data", "static-delete-account"]) if (!html.includes(marker)) fail(`installable account marker missing: ${marker}`);
for (const marker of ["renderStaticAccount", "account_profile_updated", "privacy_consent_recorded", "account_data_export_requested", "account_deletion_requested"]) if (!js.includes(marker)) fail(`account interaction missing: ${marker}`);
console.log("Stage 19 verified: 10 works, Haftsoo account center, profile, preferences, collections, history, identity, consent and data rights.");
