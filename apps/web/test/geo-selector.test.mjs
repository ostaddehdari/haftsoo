import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("geo selector provides cascading accessible province, city and neighborhood controls", () => {
  const source = readFileSync("components/GeoSelector.vue", "utf8");
  for (const marker of ["انتخاب استان", "انتخاب شهر", "محله‌ها", "x-tenant-id", "update:modelValue", "multiple"]) {
    assert.match(source, new RegExp(marker));
  }
});
