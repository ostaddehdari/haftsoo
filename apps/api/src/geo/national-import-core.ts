import type { BoundaryGeometry, GeoImportDocument, PlaceInput, Position } from "./geo-core";

export interface NationalPlaceSource {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  type: "0" | "1" | "2" | "4";
}

export interface NationalDistrictSource {
  id: number;
  name: string;
  slug: string;
  second_slug: string | null;
  city_id: number;
  city_name: string;
  city_slug: string;
  province_id: number;
  province_name: string;
  type: "district";
  geometry: BoundaryGeometry | null;
  polygon_meta: {
    status?: "not_available";
    precision?: number;
    encoded_polyline?: string;
    point_count?: number;
    bbox?: Record<string, number>;
  };
}

export interface NationalDistrictDocument {
  schema_version: "1.0.0";
  generated_at: string;
  country: "IR";
  entity: "districts";
  count: number;
  districts: NationalDistrictSource[];
  polygon_coverage: { available: number; missing: number; total: number };
}

export interface SourceArtifact {
  name: string;
  sha256: string;
  recordCount: number;
  metadata?: Record<string, unknown>;
}

export interface NationalBuildInput {
  places: NationalPlaceSource[];
  districtDocument: NationalDistrictDocument;
  artifacts: SourceArtifact[];
}

export interface NationalBuildResult {
  document: GeoImportDocument;
  quality: {
    provinces: number;
    cities: number;
    neighborhoods: number;
    polygonsAvailable: number;
    polygonsMissing: number;
    decodedPolylines: number;
    decodeMismatches: number;
    orphanCities: number;
    orphanNeighborhoods: number;
  };
}

export function decodePolyline(encoded: string, precision = 5): Position[] {
  const factor = 10 ** precision;
  const coordinates: Position[] = [];
  let latitude = 0;
  let longitude = 0;
  let index = 0;
  while (index < encoded.length) {
    const latitudeDelta = decodeValue(encoded, () => encoded.charCodeAt(index++) - 63);
    const longitudeDelta = decodeValue(encoded, () => encoded.charCodeAt(index++) - 63);
    latitude += latitudeDelta;
    longitude += longitudeDelta;
    coordinates.push([longitude / factor, latitude / factor]);
  }
  return coordinates;
}

function decodeValue(encoded: string, next: () => number): number {
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

export function coordinatesMatch(left: readonly Position[], right: readonly Position[], tolerance = 0.00001): boolean {
  if (left.length !== right.length) return false;
  return left.every(([longitude, latitude], index) => {
    const candidate = right[index];
    return Boolean(candidate) && Math.abs(longitude - candidate[0]) <= tolerance && Math.abs(latitude - candidate[1]) <= tolerance;
  });
}

export function buildNationalGeoDocument(input: NationalBuildInput): NationalBuildResult {
  const country = input.places.find((place) => place.type === "0");
  if (!country) throw new Error("country root is missing");
  const provinces = input.places.filter((place) => place.type === "1");
  const cities = input.places.filter((place) => place.type === "2");
  const provinceIds = new Set(provinces.map((place) => place.id));
  const cityIds = new Set(cities.map((place) => place.id));
  const orphanCities = cities.filter((place) => place.parent === null || !provinceIds.has(place.parent)).length;
  const orphanNeighborhoods = input.districtDocument.districts.filter((place) => !cityIds.has(place.city_id)).length;
  if (provinces.length !== 32 || cities.length !== 1177 || input.districtDocument.districts.length !== 2826) {
    throw new Error(`national count mismatch: provinces=${provinces.length} cities=${cities.length} neighborhoods=${input.districtDocument.districts.length}`);
  }
  if (orphanCities || orphanNeighborhoods) throw new Error(`national hierarchy has orphans: cities=${orphanCities} neighborhoods=${orphanNeighborhoods}`);

  let decodedPolylines = 0;
  let decodeMismatches = 0;
  const places: PlaceInput[] = [
    {
      key: "iran",
      type: "country",
      slug: "iran",
      name: "ایران",
      identifiers: [{ provider: "divar", externalId: String(country.id) }, { provider: "iso3166", externalId: "IR" }],
      metadata: { sourceType: country.type }
    },
    ...provinces.map((province) => ({
      key: `province-${province.id}`,
      parentKey: "iran",
      type: "province" as const,
      slug: province.slug.toLowerCase(),
      name: province.name,
      identifiers: [{ provider: "divar", externalId: String(province.id) }],
      metadata: { sourceType: province.type }
    })),
    ...cities.map((city) => ({
      key: `city-${city.id}`,
      parentKey: `province-${city.parent}`,
      type: "city" as const,
      slug: city.slug.toLowerCase(),
      name: city.name,
      identifiers: [{ provider: "divar", externalId: String(city.id) }],
      metadata: { sourceType: city.type }
    }))
  ];

  for (const district of input.districtDocument.districts) {
    const encoded = district.polygon_meta.encoded_polyline;
    if (encoded && district.geometry?.type === "Polygon") {
      decodedPolylines += 1;
      const decoded = decodePolyline(encoded, district.polygon_meta.precision ?? 5);
      const expected = district.geometry.coordinates[0] ?? [];
      if (!coordinatesMatch(decoded, expected)) decodeMismatches += 1;
    }
    places.push({
      key: `neighborhood-${district.id}`,
      parentKey: `city-${district.city_id}`,
      type: "neighborhood",
      slug: district.slug.toLowerCase(),
      name: district.name,
      boundary: district.geometry ?? undefined,
      identifiers: [{ provider: "divar", externalId: String(district.id) }],
      metadata: {
        sourceType: district.type,
        secondSlug: district.second_slug,
        boundaryStatus: district.geometry ? "available" : "not_available",
        encodedPolyline: encoded,
        precision: district.polygon_meta.precision ?? null,
        pointCount: district.polygon_meta.point_count ?? null
      }
    });
  }

  return {
    document: {
      schemaVersion: 1,
      source: {
        name: "haftsoo-iran-national-geo-v1",
        generatedAt: input.districtDocument.generated_at,
        attribution: "Divar public place hierarchy and derived district boundaries",
        artifacts: input.artifacts
      },
      places
    },
    quality: {
      provinces: provinces.length,
      cities: cities.length,
      neighborhoods: input.districtDocument.districts.length,
      polygonsAvailable: input.districtDocument.polygon_coverage.available,
      polygonsMissing: input.districtDocument.polygon_coverage.missing,
      decodedPolylines,
      decodeMismatches,
      orphanCities,
      orphanNeighborhoods
    }
  };
}
