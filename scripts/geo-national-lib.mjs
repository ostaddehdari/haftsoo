import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, basename } from "node:path";

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

function decodeValue(encoded, next) {
  let result = 0;
  let shift = 0;
  let byte = 0;
  do {
    if (shift > 30) throw new Error("encoded polyline value exceeds 32-bit range");
    byte = next();
    if (byte < 0 || byte > 63 || !Number.isFinite(byte)) throw new Error(`invalid encoded polyline: ${encoded.slice(0, 24)}`);
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);
  return result & 1 ? ~(result >> 1) : result >> 1;
}

export function decodePolyline(encoded, precision = 5) {
  const factor = 10 ** precision;
  const coordinates = [];
  let latitude = 0;
  let longitude = 0;
  let index = 0;
  while (index < encoded.length) {
    latitude += decodeValue(encoded, () => encoded.charCodeAt(index++) - 63);
    longitude += decodeValue(encoded, () => encoded.charCodeAt(index++) - 63);
    coordinates.push([longitude / factor, latitude / factor]);
  }
  return coordinates;
}

function coordinatesMatch(left, right, tolerance = 0.00001) {
  return left.length === right.length && left.every(([longitude, latitude], index) => {
    const candidate = right[index];
    return Boolean(candidate) && Math.abs(longitude - candidate[0]) <= tolerance && Math.abs(latitude - candidate[1]) <= tolerance;
  });
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function checksum(document) {
  return createHash("sha256").update(stable(document)).digest("hex");
}

function buildDocument(source) {
  const country = source.places.find((place) => place.type === "0");
  if (!country) throw new Error("country root is missing");
  const provinces = source.places.filter((place) => place.type === "1");
  const cities = source.places.filter((place) => place.type === "2");
  const provinceIds = new Set(provinces.map((place) => place.id));
  const cityIds = new Set(cities.map((place) => place.id));
  const orphanCities = cities.filter((place) => place.parent === null || !provinceIds.has(place.parent)).length;
  const orphanNeighborhoods = source.districts.districts.filter((place) => !cityIds.has(place.city_id)).length;
  if (provinces.length !== 32 || cities.length !== 1177 || source.districts.districts.length !== 2826) {
    throw new Error(`national count mismatch: provinces=${provinces.length} cities=${cities.length} neighborhoods=${source.districts.districts.length}`);
  }
  if (orphanCities || orphanNeighborhoods) throw new Error(`national hierarchy has orphans: cities=${orphanCities} neighborhoods=${orphanNeighborhoods}`);

  let decodedPolylines = 0;
  let decodeMismatches = 0;
  const places = [{
    key: "iran", type: "country", slug: "iran", name: "ایران",
    identifiers: [{ provider: "divar", externalId: String(country.id) }, { provider: "iso3166", externalId: "IR" }],
    metadata: { sourceType: country.type }
  }];
  places.push(...provinces.map((province) => ({
    key: `province-${province.id}`, parentKey: "iran", type: "province", slug: province.slug.toLowerCase(), name: province.name,
    identifiers: [{ provider: "divar", externalId: String(province.id) }], metadata: { sourceType: province.type }
  })));
  places.push(...cities.map((city) => ({
    key: `city-${city.id}`, parentKey: `province-${city.parent}`, type: "city", slug: city.slug.toLowerCase(), name: city.name,
    identifiers: [{ provider: "divar", externalId: String(city.id) }], metadata: { sourceType: city.type }
  })));
  for (const district of source.districts.districts) {
    const encoded = district.polygon_meta.encoded_polyline;
    if (encoded && district.geometry?.type === "Polygon") {
      decodedPolylines += 1;
      if (!coordinatesMatch(decodePolyline(encoded, district.polygon_meta.precision ?? 5), district.geometry.coordinates[0] ?? [])) decodeMismatches += 1;
    }
    places.push({
      key: `neighborhood-${district.id}`, parentKey: `city-${district.city_id}`, type: "neighborhood",
      slug: district.slug.toLowerCase(), name: district.name, boundary: district.geometry ?? undefined,
      identifiers: [{ provider: "divar", externalId: String(district.id) }],
      metadata: {
        sourceType: district.type, secondSlug: district.second_slug, boundaryStatus: district.geometry ? "available" : "not_available",
        encodedPolyline: encoded, precision: district.polygon_meta.precision ?? null, pointCount: district.polygon_meta.point_count ?? null
      }
    });
  }
  return {
    document: {
      schemaVersion: 1,
      source: { name: "haftsoo-iran-national-geo-v1", generatedAt: source.districts.generated_at,
        attribution: "Divar public place hierarchy and derived district boundaries", artifacts: source.artifacts },
      places
    },
    quality: {
      provinces: provinces.length, cities: cities.length, neighborhoods: source.districts.districts.length,
      polygonsAvailable: source.districts.polygon_coverage.available, polygonsMissing: source.districts.polygon_coverage.missing,
      decodedPolylines, decodeMismatches, orphanCities, orphanNeighborhoods
    }
  };
}

function validateDocument(document) {
  const issues = [];
  const keys = new Set();
  const identifiers = new Set();
  const types = new Map(document.places.map((place) => [place.key, place.type]));
  const allowed = { country: [], province: ["country"], city: ["province"], neighborhood: ["city"] };
  for (const [index, place] of document.places.entries()) {
    const path = `places[${index}]`;
    const error = (code, message) => issues.push({ severity: "error", code, path, message });
    if (keys.has(place.key)) error("place.duplicate_key", "duplicate place key");
    keys.add(place.key);
    if (!/^[a-z0-9][a-z0-9-]{0,95}$/.test(place.slug)) error("place.slug", "invalid place slug");
    if (!place.parentKey && place.type !== "country") error("place.root_type", "only country may be root");
    if (place.parentKey && !allowed[place.type]?.includes(types.get(place.parentKey))) error("place.hierarchy", "invalid place hierarchy");
    if (place.type === "neighborhood" && !place.boundary && place.metadata?.boundaryStatus !== "not_available") error("place.boundary_required", "missing boundary status");
    for (const identifier of place.identifiers ?? []) {
      const identity = `${identifier.provider}:${identifier.externalId}`;
      if (identifiers.has(identity)) error("identifier.duplicate", "duplicate provider identifier");
      identifiers.add(identity);
    }
  }
  return issues;
}

export async function buildNational() {
  const source = readNationalSources();
  const result = buildDocument(source);
  const issues = validateDocument(result.document);
  return { ...source, ...result, issues, checksum: checksum(result.document) };
}
