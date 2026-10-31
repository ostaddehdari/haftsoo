import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/geo/national-import-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("decodes Google encoded polyline precision 5 into GeoJSON longitude-latitude order", () => {
  assert.deepEqual(core.decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@", 5), [
    [-120.2, 38.5], [-120.95, 40.7], [-126.453, 43.252]
  ]);
});

test("rejects malformed encoded polyline", () => {
  assert.throws(() => core.decodePolyline("_p~iF~ps|", 5), /invalid encoded polyline/);
});

test("compares decoded rings using coordinate tolerance", () => {
  assert.equal(core.coordinatesMatch([[51.12345, 32.12345]], [[51.123451, 32.123449]]), true);
  assert.equal(core.coordinatesMatch([[51.1, 32.1]], [[51.2, 32.1]]), false);
});
