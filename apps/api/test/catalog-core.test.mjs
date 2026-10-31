import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import catalogCore from "../dist/catalog/catalog-core.js";

const { buildCategoryTree, catalogChecksum, resolveCategoryForm, validateCatalogImport } = catalogCore;
const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/catalog/sample-catalog.json", import.meta.url), "utf8"));

test("catalog fixture is valid and checksum is deterministic", () => {
  assert.deepEqual(validateCatalogImport(fixture), []);
  assert.match(catalogChecksum(fixture), /^[a-f0-9]{64}$/);
  assert.equal(catalogChecksum(fixture), catalogChecksum(JSON.parse(JSON.stringify(fixture))));
});

test("category tree is ordered and exposes hierarchy depth", () => {
  const tree = buildCategoryTree(fixture.categories);
  assert.equal(tree.length, 2);
  assert.equal(tree[0].key, "vehicles");
  assert.equal(tree[0].children[0].key, "cars");
  assert.equal(tree[0].children[0].depth, 1);
});

test("dynamic rules can require a field from submitted values", () => {
  const ground = resolveCategoryForm(fixture, "apartments-rent", { floor: 0 });
  const upper = resolveCategoryForm(fixture, "apartments-rent", { floor: 3 });
  assert.equal(ground.find((field) => field.key === "has-elevator").required, false);
  assert.equal(upper.find((field) => field.key === "has-elevator").required, true);
});

test("validator rejects cycles, missing fields and malformed selects", () => {
  const invalid = structuredClone(fixture);
  invalid.categories[0].parentKey = "cars";
  invalid.forms[0].fields.push({ fieldKey: "missing", position: 99 });
  invalid.fields[1].options = [];
  invalid.forms[1].fields[2].rules = [{ dependsOn: "has-elevator", operator: "eq", operand: true, effect: "show" }];
  const codes = validateCatalogImport(invalid).map((issue) => issue.code);
  assert.ok(codes.includes("category.cycle"));
  assert.ok(codes.includes("form.field_missing"));
  assert.ok(codes.includes("field.options_required"));
  assert.ok(codes.includes("rule.self_dependency"));
});
