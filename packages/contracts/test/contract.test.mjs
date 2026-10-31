import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("shared contracts expose versioned health and chat types", async () => {
  const source = await readFile(new URL("../src/index.ts", import.meta.url), "utf8");
  assert.match(source, /ServiceHealth/);
  assert.match(source, /ChatMessageDraft/);
  assert.match(source, /API_VERSION/);
});
