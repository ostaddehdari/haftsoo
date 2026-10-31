import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const sourceFile = process.argv[2];
if (!sourceFile) {
  console.error("Usage: node scripts/geo-import.mjs <geo.json>");
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
if (!document.source?.name || Number.isNaN(Date.parse(document.source?.generatedAt))) failures.push("source metadata is invalid");
if (!Array.isArray(document.places) || !document.places.length) failures.push("places must be non-empty");
const keys = new Set();
const identifiers = new Set();
const types = new Set(["country", "province", "county", "district", "rural_district", "city", "neighborhood"]);
for (const place of document.places ?? []) {
  if (keys.has(place.key)) failures.push(`duplicate place key: ${place.key}`);
  keys.add(place.key);
  if (!types.has(place.type)) failures.push(`unsupported type: ${place.type}`);
  if (place.type === "neighborhood" && !place.boundary) failures.push(`neighborhood boundary missing: ${place.key}`);
  for (const identifier of place.identifiers ?? []) {
    const key = `${identifier.provider}:${identifier.externalId}`;
    if (identifiers.has(key)) failures.push(`duplicate provider identifier: ${key}`);
    identifiers.add(key);
  }
}
for (const place of document.places ?? []) if (place.parentKey && !keys.has(place.parentKey)) failures.push(`missing parent: ${place.parentKey}`);
if (failures.length) {
  console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exit(1);
}
const checksum = createHash("sha256").update(stable(document)).digest("hex");
const counts = Object.fromEntries([...types].map((type) => [type, document.places.filter((place) => place.type === type).length]));
console.log(JSON.stringify({ valid: true, checksum, counts: { places: document.places.length, withBoundary: document.places.filter((place) => place.boundary).length, ...counts } }, null, 2));
