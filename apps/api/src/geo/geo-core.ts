import { createHash } from "node:crypto";

export const PLACE_TYPES = ["country", "province", "county", "district", "rural_district", "city", "neighborhood"] as const;
export type PlaceType = typeof PLACE_TYPES[number];
export type Position = [number, number];
export type LinearRing = Position[];
export type PolygonCoordinates = LinearRing[];
export type MultiPolygonCoordinates = PolygonCoordinates[];

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: PolygonCoordinates;
}

export interface MultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: MultiPolygonCoordinates;
}

export type BoundaryGeometry = PolygonGeometry | MultiPolygonGeometry;

export interface PlaceIdentifierInput {
  provider: string;
  externalId: string;
  metadata?: Record<string, unknown>;
}

export interface PlaceInput {
  key: string;
  parentKey?: string;
  type: PlaceType;
  slug: string;
  name: string;
  aliases?: string[];
  center?: { longitude: number; latitude: number };
  boundary?: BoundaryGeometry;
  identifiers?: PlaceIdentifierInput[];
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

export interface GeoImportDocument {
  schemaVersion: 1;
  source: {
    name: string;
    generatedAt: string;
    license?: string;
    attribution?: string;
    artifacts?: Array<{ name: string; sha256: string; recordCount: number; metadata?: Record<string, unknown> }>;
  };
  places: PlaceInput[];
}

export interface GeoValidationIssue {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
}

export interface PlaceNode extends PlaceInput {
  depth: number;
  children: PlaceNode[];
}

const keyPattern = /^[a-z][a-z0-9_-]{1,95}$/;
const slugPattern = /^[a-z0-9][a-z0-9-]{0,95}$/;
const providerPattern = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const allowedParents: Readonly<Record<PlaceType, readonly PlaceType[]>> = {
  country: [],
  province: ["country"],
  county: ["province"],
  district: ["county"],
  rural_district: ["district"],
  city: ["province", "county", "district"],
  neighborhood: ["city"]
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function geoChecksum(document: GeoImportDocument): string {
  return createHash("sha256").update(stable(document)).digest("hex");
}

export function asMultiPolygon(geometry: BoundaryGeometry): MultiPolygonGeometry {
  return geometry.type === "MultiPolygon" ? geometry : { type: "MultiPolygon", coordinates: [geometry.coordinates] };
}

export function geometryBBox(geometry: BoundaryGeometry): [number, number, number, number] {
  let minLongitude = Infinity;
  let minLatitude = Infinity;
  let maxLongitude = -Infinity;
  let maxLatitude = -Infinity;
  for (const polygon of asMultiPolygon(geometry).coordinates) {
    for (const ring of polygon) {
      for (const [longitude, latitude] of ring) {
        minLongitude = Math.min(minLongitude, longitude);
        minLatitude = Math.min(minLatitude, latitude);
        maxLongitude = Math.max(maxLongitude, longitude);
        maxLatitude = Math.max(maxLatitude, latitude);
      }
    }
  }
  return [minLongitude, minLatitude, maxLongitude, maxLatitude];
}

function pointInRing(point: Position, ring: LinearRing): boolean {
  let inside = false;
  const [x, y] = point;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previous];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function pointInBoundary(point: Position, geometry: BoundaryGeometry): boolean {
  return asMultiPolygon(geometry).coordinates.some((polygon) => {
    if (!polygon[0] || !pointInRing(point, polygon[0])) return false;
    return !polygon.slice(1).some((hole) => pointInRing(point, hole));
  });
}

export function validateGeoImport(document: GeoImportDocument): GeoValidationIssue[] {
  const issues: GeoValidationIssue[] = [];
  const places = new Map<string, PlaceInput>();
  const siblingSlugs = new Set<string>();
  const identifiers = new Set<string>();
  const add = (severity: "error" | "warning", code: string, path: string, message: string) => issues.push({ severity, code, path, message });
  if (document.schemaVersion !== 1) add("error", "schema.unsupported", "schemaVersion", "schemaVersion must be 1");
  if (!document.source?.name?.trim()) add("error", "source.required", "source.name", "source name is required");
  if (Number.isNaN(Date.parse(document.source?.generatedAt))) add("error", "source.date", "source.generatedAt", "generatedAt must be ISO-8601");

  document.places.forEach((place, index) => {
    const path = `places[${index}]`;
    if (!keyPattern.test(place.key)) add("error", "place.key", `${path}.key`, "invalid place key");
    if (places.has(place.key)) add("error", "place.duplicate_key", `${path}.key`, "duplicate place key");
    places.set(place.key, place);
    if (!PLACE_TYPES.includes(place.type)) add("error", "place.type", `${path}.type`, "unsupported place type");
    if (!slugPattern.test(place.slug)) add("error", "place.slug", `${path}.slug`, "invalid place slug");
    if (!place.name.trim()) add("error", "place.name", `${path}.name`, "place name is required");
    const siblingKey = `${place.parentKey ?? "root"}:${place.slug}`;
    if (siblingSlugs.has(siblingKey)) add("error", "place.duplicate_slug", `${path}.slug`, "slug must be unique below its parent");
    siblingSlugs.add(siblingKey);
    const boundaryUnavailable = place.metadata?.boundaryStatus === "not_available";
    if (place.type === "neighborhood" && !place.boundary && !boundaryUnavailable) add("error", "place.boundary_required", `${path}.boundary`, "neighborhood boundary or explicit not_available status is required");
    if (place.center && (place.center.longitude < 44 || place.center.longitude > 64 || place.center.latitude < 24 || place.center.latitude > 40)) {
      add("error", "place.center_bounds", `${path}.center`, "center is outside Iran bounds");
    }
    for (const [identifierIndex, identifier] of (place.identifiers ?? []).entries()) {
      if (!providerPattern.test(identifier.provider) || !identifier.externalId.trim()) add("error", "identifier.invalid", `${path}.identifiers[${identifierIndex}]`, "provider and externalId are invalid");
      const identifierKey = `${identifier.provider}:${identifier.externalId}`;
      if (identifiers.has(identifierKey)) add("error", "identifier.duplicate", `${path}.identifiers[${identifierIndex}]`, "provider identifier is duplicated");
      identifiers.add(identifierKey);
    }
    if (place.boundary) validateGeometry(place.boundary, path, add);
    if (place.center && place.boundary && !pointInBoundary([place.center.longitude, place.center.latitude], place.boundary)) {
      add("warning", "place.center_outside", `${path}.center`, "center is outside the supplied boundary");
    }
  });

  for (const [artifactIndex, artifact] of (document.source?.artifacts ?? []).entries()) {
    if (!artifact.name?.trim() || !/^[a-f0-9]{64}$/.test(artifact.sha256) || !Number.isInteger(artifact.recordCount) || artifact.recordCount < 1) {
      add("error", "source.artifact", `source.artifacts[${artifactIndex}]`, "source artifact needs name, SHA-256 and positive recordCount");
    }
  }

  document.places.forEach((place, index) => {
    const path = `places[${index}]`;
    if (!place.parentKey) {
      if (place.type !== "country") add("error", "place.root_type", `${path}.type`, "only country may be a root place");
      return;
    }
    const parent = places.get(place.parentKey);
    if (!parent) add("error", "place.parent_missing", `${path}.parentKey`, "parent place does not exist");
    else if (!allowedParents[place.type].includes(parent.type)) add("error", "place.hierarchy", `${path}.parentKey`, `${parent.type} cannot contain ${place.type}`);
    const visited = new Set<string>([place.key]);
    let cursor: PlaceInput | undefined = place;
    let depth = 0;
    while (cursor?.parentKey) {
      if (visited.has(cursor.parentKey)) {
        add("error", "place.cycle", `${path}.parentKey`, "place hierarchy contains a cycle");
        break;
      }
      visited.add(cursor.parentKey);
      cursor = places.get(cursor.parentKey);
      depth += 1;
      if (depth > 8) {
        add("error", "place.depth", `${path}.parentKey`, "place depth exceeds 8");
        break;
      }
    }
  });
  return issues;
}

function validateGeometry(
  geometry: BoundaryGeometry,
  path: string,
  add: (severity: "error" | "warning", code: string, path: string, message: string) => void
): void {
  const polygons = asMultiPolygon(geometry).coordinates;
  if (!polygons.length) add("error", "geometry.empty", `${path}.boundary`, "boundary has no polygons");
  polygons.forEach((polygon, polygonIndex) => {
    if (!polygon.length) add("error", "geometry.empty_polygon", `${path}.boundary.coordinates[${polygonIndex}]`, "polygon has no rings");
    polygon.forEach((ring, ringIndex) => {
      const ringPath = `${path}.boundary.coordinates[${polygonIndex}][${ringIndex}]`;
      if (ring.length < 4) add("error", "geometry.short_ring", ringPath, "linear ring needs at least four positions");
      const first = ring[0];
      const last = ring.at(-1);
      if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) add("error", "geometry.open_ring", ringPath, "linear ring must be closed");
      for (const [positionIndex, position] of ring.entries()) {
        const [longitude, latitude] = position;
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
          add("error", "geometry.position", `${ringPath}[${positionIndex}]`, "coordinate is outside WGS84 bounds");
        }
      }
    });
  });
  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = geometryBBox(geometry);
  if (minLongitude < 44 || maxLongitude > 64 || minLatitude < 24 || maxLatitude > 40) add("warning", "geometry.iran_bounds", `${path}.boundary`, "boundary extends outside Iran bounds");
}

export function buildPlaceTree(placeInputs: readonly PlaceInput[]): PlaceNode[] {
  const nodes = new Map(placeInputs.map((place) => [place.key, { ...place, depth: 0, children: [] } as PlaceNode]));
  const roots: PlaceNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentKey ? nodes.get(node.parentKey) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const order = (items: PlaceNode[], depth: number) => {
    items.sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.key.localeCompare(right.key));
    for (const item of items) { item.depth = depth; order(item.children, depth + 1); }
  };
  order(roots, 0);
  return roots;
}
