import { BadRequestException, Injectable } from "@nestjs/common";
import { OpenSearchClient } from "./opensearch.client";
import { buildViewportQuery, cameraHash, mapBucketsToClusters, MapViewportInput, RawMapBucket } from "./map-view-core";

interface ViewportResult {
  took: number;
  hits: { total: { value: number } | number };
  aggregations?: { map_clusters?: { buckets?: RawMapBucket[] } };
}

@Injectable()
export class MapViewService {
  constructor(private readonly client: OpenSearchClient) {}

  async viewport(input: MapViewportInput, tenantId: string) {
    let hash: string;
    let query: Record<string, unknown>;
    try {
      hash = cameraHash(input.camera);
      query = buildViewportQuery(input, tenantId);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "invalid map viewport");
    }
    const result = await this.client.search<ViewportResult>(query);
    const total = typeof result.hits.total === "number" ? result.hits.total : result.hits.total.value;
    return {
      clusters: mapBucketsToClusters(result.aggregations?.map_clusters?.buckets ?? [], input.camera.zoom),
      total,
      cameraHash: hash,
      showSearchThisArea: Boolean(input.previousCameraHash && input.previousCameraHash !== hash),
      tookMs: result.took
    };
  }
}
