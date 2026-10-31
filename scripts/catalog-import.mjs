import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const sourceFile = process.argv[2];
if (!sourceFile) {
  console.error("Usage: node scripts/catalog-import.mjs <catalog.json>");
  process.exit(2);
}

const document = JSON.parse(readFileSync(sourceFile, "utf8"));
const stable = (value) => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
};
const failures = [];
if (document.schemaVersion !== 1) failures.push("schemaVersion must be 1");
if (!Array.isArray(document.categories) || !document.categories.length) failures.push("categories must be non-empty");
if (!Array.isArray(document.fields)) failures.push("fields must be an array");
if (!Array.isArray(document.forms)) failures.push("forms must be an array");
const categoryKeys = new Set();
for (const category of document.categories ?? []) {
  if (categoryKeys.has(category.key)) failures.push(`duplicate category key: ${category.key}`);
  categoryKeys.add(category.key);
}
for (const category of document.categories ?? []) if (category.parentKey && !categoryKeys.has(category.parentKey)) failures.push(`missing parent: ${category.parentKey}`);
if (failures.length) {
  console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exit(1);
}
const checksum = createHash("sha256").update(stable(document)).digest("hex");
console.log(JSON.stringify({ valid: true, checksum, counts: { categories: document.categories.length, fields: document.fields.length, forms: document.forms.length } }, null, 2));
