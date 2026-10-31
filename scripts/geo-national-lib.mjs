import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, basename } from "node:path";
import ts from "typescript";

export function loadTypeScriptModule(path) {
  const source = readFileSync(path, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: true }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

function sourceBuffer(source) {
  if (existsSync(source.path)) return readFileSync(source.path);
  const directory = dirname(source.partsPattern);
  const prefix = basename(source.partsPattern).replace("*", "");
  const parts = readdirSync(directory).filter((file) => file.startsWith(prefix)).sort();
  if (!parts.length) throw new Error(`source artifact is missing: ${source.path}`);
  return Buffer.from(parts.map((file) => readFileSync(`${directory}/${file}`, "utf8").trim()).join(""), "base64");
}

export function readNationalSources() {
  const manifest = JSON.parse(readFileSync("data/geo/national-manifest.json", "utf8"));
  const documents = new Map();
  const artifacts = [];
  for (const source of manifest.sources) {
    const compressed = sourceBuffer(source);
    const digest = createHash("sha256").update(compressed).digest("hex");
    if (digest !== source.sha256) throw new Error(`compressed checksum mismatch for ${source.name}`);
    const raw = gunzipSync(compressed);
    const rawDigest = createHash("sha256").update(raw).digest("hex");
    if (rawDigest !== source.rawSha256) throw new Error(`raw checksum mismatch for ${source.name}`);
    documents.set(source.name, JSON.parse(raw.toString("utf8")));
    artifacts.push({ name: source.name, sha256: digest, recordCount: source.recordCount, metadata: { sourceUrl: source.sourceUrl, rawSha256: rawDigest } });
  }
  return { manifest, places: documents.get("places-web.json.gz"), districts: documents.get("iran-districts.json.gz"), artifacts };
}

export async function buildNational() {
  const source = readNationalSources();
  const core = await loadTypeScriptModule("apps/api/src/geo/national-import-core.ts");
  const geo = await loadTypeScriptModule("apps/api/src/geo/geo-core.ts");
  const result = core.buildNationalGeoDocument({ places: source.places, districtDocument: source.districts, artifacts: source.artifacts });
  const issues = geo.validateGeoImport(result.document);
  return { ...source, ...result, issues, checksum: geo.geoChecksum(result.document) };
}
