import { existsSync, readFileSync } from "node:fs";
const fail = message => { throw new Error(`[account-contract] ${message}`); };
const files = [
  "apps/api/src/account/account-core.ts", "apps/api/src/account/account.repository.ts", "apps/api/src/account/account.service.ts", "apps/api/src/account/account.controller.ts",
  "apps/web/composables/useAccount.ts", "apps/web/components/AccountShell.vue", "apps/web/pages/my/index.vue", "apps/web/pages/my/profile.vue", "apps/web/pages/my/settings/privacy.vue",
  "database/migrations/000012_account_profile_privacy.up.sql", "database/migrations/000012_account_profile_privacy.down.sql", "account/policy.json"
];
for (const file of files) if (!existsSync(file)) fail(`missing ${file}`);
const core = readFileSync(files[0], "utf8"), repository = readFileSync(files[1], "utf8"), controller = readFileSync(files[3], "utf8"), migration = readFileSync(files[9], "utf8"), policy = JSON.parse(readFileSync(files[11], "utf8"));
for (const marker of ["recentViewLimit:100", "recentRetentionDays:90", "deletionGraceDays:30", "normalizeConsent", "accountOverview"]) if (!core.includes(marker)) fail(`account core marker missing: ${marker}`);
for (const marker of ["bookmark_collections", "recent_views", "saved_searches", "user_consents", "data_requests"]) if (!repository.includes(marker)) fail(`repository marker missing: ${marker}`);
for (const marker of ["Controller(\"account\")", "Get(\"overview\")", "bookmark-collections", "saved-searches", "data-requests/:kind"]) if (!controller.includes(marker)) fail(`controller marker missing: ${marker}`);
for (const marker of ["identity.user_profiles", "identity.user_preferences", "identity.bookmark_collections", "identity.recent_views", "identity.user_consents", "identity.data_requests", "FORCE ROW LEVEL SECURITY", "prevent_consent_mutation"]) if (!migration.includes(marker)) fail(`migration marker missing: ${marker}`);
if (!policy.consent.appendOnly || policy.dataRights.deletionGraceDays !== 30 || policy.recentViews.maximumItems !== 100 || policy.isolation.tenantRls !== "forced") fail("account policy is incomplete");
console.log("Account contract passed: profile, preferences, collections, recent views, saved searches, identity, append-only consent and reversible data rights.");
