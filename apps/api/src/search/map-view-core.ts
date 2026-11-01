import { createHash } from "node:crypto";
import { buildSearchQuery, SearchInput } from "./search-core";

export interface MapBoundingBox {
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
}

export interface MapCameraInput {
  bbox: MapBoundingBox;
  zoom: number;
  center?: { longitude: number; latitude: number };
}

export interface MapViewportInput {
  camera: MapCameraInput;
  search: SearchInput;
  selectedNeighborhoodKeys?: string[];
  previousCameraHash?: string;
}

export function validateCamera(camera: MapCameraInput): MapCameraInput {
  const values = Object.values(camera.bbox);
  if (values.some((value) => !Number.isFinite(value))) throw new Error("map bounding box must contain finite coordinates");
  const { minLongitude, minLatitude, maxLongitude, maxLatitude } = camera.bbox;
  if (minLongitude < 43 || maxLongitude > 64 || minLatitude < 24 || maxLatitude > 40) throw new Error("map bounding box is outside Iran");
  if (minLongitude >= maxLongitude || minLatitude >= maxLatitude) throw new Error("map bounding box has invalid axis order");
  if (maxLongitude - minLongitude > 12 || maxLatitude - minLatitude > 9) throw new Error("map bounding box is too large");
  if (!Number.isFinite(camera.zoom) || camera.zoom < 4 || camera.zoom > 20) throw new Error("map zoom must be between 4 and 20");
  return camera;
}

export function cameraHash(camera: MapCameraInput): string {
  const normalized = {
    bbox: Object.fromEntries(Object.entries(camera.bbox).map(([key, value]) => [key, Number(value.toFixed(5))])),
    zoom: Number(camera.zoom.toFixed(2))
  };
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex").slice(0, 20);
}

export function geotilePrecision(zoom: number): number {
  return Math.min(Math.max(Math.floor(zoom) + 1, 5), 16);
}

export function buildViewportQuery(input: MapViewportInput, tenantId: string): Record<string, unknown> {
  const camera = validateCamera(input.camera);
  const base = buildSearchQuery({ ...input.search, limit: 1 }, tenantId) as {
    query: { function_score: { query: { bool: { filter: Record<string, unknown>[] } } } };
  };
  base.query.function_score.query.bool.filter.push({
    geo_bounding_box: {
      location: {
        top_left: { lat: camera.bbox.maxLatitude, lon: camera.bbox.minLongitude },
        bottom_right: { lat: camera.bbox.minLatitude, lon: camera.bbox.maxLongitude }
      }
    }
  });
  return {
    size: 0,
    track_total_hits: true,
    query: base.query,
    aggs: {
      map_clusters: {
        geotile_grid: {
          field: "location",
          precision: geotilePrecision(camera.zoom),
          size: camera.zoom >= 15 ? 2000 : 700,
          bounds: {
            top_left: { lat: camera.bbox.maxLatitude, lon: camera.bbox.minLongitude },
            bottom_right: { lat: camera.bbox.minLatitude, lon: camera.bbox.maxLongitude }
          }
        },
        aggs: {
          center: { geo_centroid: { field: "location" } },
          preview: { top_hits: { size: 1, sort: [{ published_at: "desc" }], _source: ["title_display", "category_slug", "city_id", "district_id", "price", "published_at", "thumbnail_url", "location"] } }
        }
      }
    }
  };
}

export interface RawMapBucket {
  key: string;
  doc_count: number;
  center?: { location?: { lat: number; lon: number } };
  preview?: { hits?: { hits?: Array<{ _id: string; _source: Record<string, unknown> }> } };
}

export function mapBucketsToClusters(buckets: readonly RawMapBucket[], zoom: number) {
  return buckets.flatMap((bucket) => {
    const location = bucket.center?.location;
    if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lon)) return [];
    const hit = bucket.preview?.hits?.hits?.[0];
    return [{
      id: bucket.key,
      longitude: location.lon,
      latitude: location.lat,
      count: bucket.doc_count,
      destinationZoom: Math.min(Math.max(Math.floor(zoom) + (bucket.doc_count > 1 ? 2 : 1), 5), 20),
      preview: hit ? { id: hit._id, ...hit._source } : undefined
    }];
  });
}
