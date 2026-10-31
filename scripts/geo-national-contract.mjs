import { buildNational } from "./geo-national-lib.mjs";

const result = await buildNational();
const expected = result.manifest.expected;
const actual = result.quality;
const errors = result.issues.filter((issue) => issue.severity === "error");
const checks = [
  [actual.provinces, expected.provinces, "provinces"], [actual.cities, expected.cities, "cities"],
  [actual.neighborhoods, expected.neighborhoods, "neighborhoods"], [result.document.places.length, expected.places, "places"],
  [actual.polygonsAvailable, expected.polygonsAvailable, "available polygons"], [actual.polygonsMissing, expected.polygonsMissing, "missing polygons"],
  [actual.decodeMismatches, 0, "polyline mismatches"], [actual.orphanCities + actual.orphanNeighborhoods, 0, "orphans"], [errors.length, 0, "validation errors"]
];
for (const [value, wanted, label] of checks) if (value !== wanted) throw new Error(`${label}: expected ${wanted}, received ${value}`);
console.log(`National geography contract passed: ${expected.provinces} provinces, ${expected.cities} cities, ${expected.neighborhoods} neighborhoods, ${actual.polygonsAvailable} polygons.`);
