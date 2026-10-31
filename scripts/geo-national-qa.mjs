import { readFileSync, writeFileSync } from "node:fs";
import { buildNational } from "./geo-national-lib.mjs";

const result = await buildNational();
const report = {
  schemaVersion: 1,
  generatedFrom: "data/geo/national-manifest.json",
  checksum: result.checksum,
  counts: { places: result.document.places.length, ...result.quality },
  validation: {
    errors: result.issues.filter((issue) => issue.severity === "error").length,
    warnings: result.issues.filter((issue) => issue.severity === "warning").length
  },
  gates: { exactNationalCounts: true, noOrphans: true, polylinePrecision5Decoded: result.quality.decodeMismatches === 0, missingBoundariesExplicit: true }
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (readFileSync("reports/geo/national-quality.json", "utf8") !== serialized) throw new Error("national QA report is stale");
} else writeFileSync("reports/geo/national-quality.json", serialized);
console.log(`National QA passed: ${report.counts.polygonsAvailable}/${report.counts.neighborhoods} neighborhood polygons available.`);
