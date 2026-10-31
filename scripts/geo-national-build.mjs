import { gzipSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { buildNational } from "./geo-national-lib.mjs";

const result = await buildNational();
const errors = result.issues.filter((issue) => issue.severity === "error");
if (errors.length || result.quality.decodeMismatches || result.quality.orphanCities || result.quality.orphanNeighborhoods) {
  throw new Error(`national build failed: errors=${errors.length} mismatches=${result.quality.decodeMismatches}`);
}
const outputIndex = process.argv.indexOf("--output");
if (outputIndex >= 0) {
  const output = process.argv[outputIndex + 1];
  if (!output) throw new Error("--output needs a path");
  writeFileSync(output, gzipSync(Buffer.from(JSON.stringify(result.document)), { level: 9, mtime: 0 }));
}
console.log(JSON.stringify({ checksum: result.checksum, places: result.document.places.length, ...result.quality }));
