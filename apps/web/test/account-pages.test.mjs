import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Haftsoo account pages expose profile, privacy and data-right flows", () => {
  const account = readFileSync(new URL("../composables/useAccount.ts", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../components/AccountShell.vue", import.meta.url), "utf8");
  const privacy = readFileSync(new URL("../pages/my/settings/privacy.vue", import.meta.url), "utf8");
  const overview = readFileSync(new URL("../pages/my/index.vue", import.meta.url), "utf8");
  assert.match(account, /account\/overview/);
  assert.match(account, /data-requests\/\$\{kind\}/);
  assert.match(account, /recordConsent/);
  assert.match(shell, /هفت‌سوی من/);
  assert.match(privacy, /data\('export'\)/);
  assert.match(privacy, /data\('delete'\)/);
  assert.match(privacy, /cancelDeletion/);
  assert.match(overview, /IdentityStatusCard/);
});
