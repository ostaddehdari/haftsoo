import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Nuxt configuration supports the deployment base path", async () => {
  const source = await readFile(new URL("../nuxt.config.ts", import.meta.url), "utf8");
  assert.match(source, /NUXT_APP_BASE_URL/);
  assert.match(source, /NUXT_PUBLIC_API_BASE/);
});
