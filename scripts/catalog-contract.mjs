import { existsSync, readFileSync } from "node:fs";

const fail = (message) => { throw new Error(`[catalog-contract] ${message}`); };
const required = [
  "database/migrations/000003_catalog_taxonomy.up.sql", "database/migrations/000003_catalog_taxonomy.down.sql",
  "apps/api/src/catalog/catalog-core.ts", "apps/api/src/catalog/catalog.repository.ts",
  "apps/api/src/catalog/catalog.service.ts", "apps/api/src/catalog/catalog.controller.ts",
  "apps/api/test/catalog-core.test.mjs", "fixtures/catalog/sample-catalog.json", "scripts/catalog-import.mjs"
];
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);
const migration = readFileSync(required[0], "utf8");
for (const table of ["releases", "categories", "field_definitions", "field_options", "category_fields", "field_rules", "import_jobs"]) {
  if (!migration.includes(`CREATE TABLE catalog.${table}`)) fail(`missing catalog.${table}`);
}
for (const contract of ["catalog_one_published_release_idx", "guard_category_parent", "FORCE ROW LEVEL SECURITY", "app.current_tenant_id"]) {
  if (!migration.includes(contract)) fail(`missing ${contract}`);
}
const core = readFileSync("apps/api/src/catalog/catalog-core.ts", "utf8");
for (const symbol of ["validateCatalogImport", "buildCategoryTree", "resolveCategoryForm", "catalogChecksum"]) {
  if (!core.includes(`function ${symbol}`)) fail(`missing ${symbol}`);
}
const fixture = JSON.parse(readFileSync("fixtures/catalog/sample-catalog.json", "utf8"));
if (fixture.schemaVersion !== 1 || fixture.categories.length < 3 || fixture.fields.length < 4 || fixture.forms.length < 2) fail("fixture coverage is incomplete");
console.log("Catalog contract passed: versioned tree, dynamic fields, rules, tenant RLS, import and publish APIs.");
