import type { GeoImportDocument } from "./geo-core";
import { asMultiPolygon } from "./geo-core";
import type { SqlClient, SqlRow } from "../database/database-core";

export interface GeoReleaseRow extends SqlRow {
  id: string;
  version: number;
  checksum: string;
  published_at: Date;
}

export class GeoRepository {
  constructor(private readonly client: SqlClient) {}

  async publishedRelease(): Promise<GeoReleaseRow | undefined> {
    const result = await this.client.query<GeoReleaseRow>(
      `SELECT id, version, checksum, published_at
         FROM geo.releases
        WHERE tenant_id = current_setting('app.current_tenant_id')::uuid AND state = 'published'
        LIMIT 1`
    );
    return result.rows[0];
  }

  async children(releaseId: string, parentKey?: string, type?: string): Promise<SqlRow[]> {
    const result = await this.client.query(
      `SELECT place.external_key AS key, parent.external_key AS parent_key, place.type, place.slug::text,
              place.name, place.aliases, place.depth, place.sort_order, place.metadata,
              ST_X(place.center::geometry) AS longitude, ST_Y(place.center::geometry) AS latitude,
              CASE WHEN place.bbox IS NULL THEN NULL ELSE ST_AsGeoJSON(place.bbox)::jsonb END AS bbox
         FROM geo.places place
         LEFT JOIN geo.places parent ON parent.id = place.parent_id
        WHERE place.release_id = $1::uuid AND place.is_active
          AND (($2::text IS NULL AND place.parent_id IS NULL) OR parent.external_key = $2)
          AND ($3::text IS NULL OR place.type = $3)
        ORDER BY place.sort_order, place.id
        LIMIT 500`,
      [releaseId, parentKey ?? null, type ?? null]
    );
    return result.rows;
  }

  async place(releaseId: string, key: string): Promise<SqlRow | undefined> {
    const result = await this.client.query(
      `SELECT place.external_key AS key, parent.external_key AS parent_key, place.type, place.slug::text,
              place.name, place.aliases, place.depth, place.sort_order, place.metadata,
              ST_X(place.center::geometry) AS longitude, ST_Y(place.center::geometry) AS latitude,
              CASE WHEN place.bbox IS NULL THEN NULL ELSE ST_AsGeoJSON(place.bbox)::jsonb END AS bbox,
              COALESCE(identifier.items, '[]'::jsonb) AS identifiers
         FROM geo.places place
         LEFT JOIN geo.places parent ON parent.id = place.parent_id
         LEFT JOIN LATERAL (
           SELECT jsonb_agg(jsonb_build_object('provider', item.provider, 'externalId', item.external_id, 'metadata', item.metadata)
                            ORDER BY item.provider) AS items
             FROM geo.place_identifiers item WHERE item.place_id = place.id
         ) identifier ON true
        WHERE place.release_id = $1::uuid AND place.external_key = $2 AND place.is_active
        LIMIT 1`,
      [releaseId, key]
    );
    return result.rows[0];
  }

  async boundary(releaseId: string, key: string, precision: "full" | "simplified"): Promise<SqlRow | undefined> {
    const geometryColumn = precision === "full" ? "boundary" : "boundary_simplified";
    const result = await this.client.query(
      `SELECT external_key AS key, name, type,
              ST_AsGeoJSON(${geometryColumn}, 6)::jsonb AS geometry,
              ST_AsGeoJSON(bbox, 6)::jsonb AS bbox
         FROM geo.places
        WHERE release_id = $1::uuid AND external_key = $2 AND is_active AND ${geometryColumn} IS NOT NULL
        LIMIT 1`,
      [releaseId, key]
    );
    return result.rows[0];
  }

  async search(releaseId: string, query: string, limit: number): Promise<SqlRow[]> {
    const result = await this.client.query(
      `SELECT external_key AS key, type, slug::text, name, aliases,
              ST_X(center::geometry) AS longitude, ST_Y(center::geometry) AS latitude,
              GREATEST(similarity(name, $2), similarity(array_to_string(aliases, ' '), $2)) AS score
         FROM geo.places
        WHERE release_id = $1::uuid AND is_active
          AND (name ILIKE '%' || $2 || '%' OR EXISTS (SELECT 1 FROM unnest(aliases) alias WHERE alias ILIKE '%' || $2 || '%'))
        ORDER BY score DESC, depth DESC, sort_order, id
        LIMIT $3`,
      [releaseId, query, limit]
    );
    return result.rows;
  }

  async resolvePoint(releaseId: string, longitude: number, latitude: number, type?: string): Promise<SqlRow[]> {
    const result = await this.client.query(
      `WITH point AS (SELECT ST_SetSRID(ST_MakePoint($2, $3), 4326) AS geometry)
       SELECT place.external_key AS key, place.type, place.slug::text, place.name, place.depth,
              ST_X(place.center::geometry) AS longitude, ST_Y(place.center::geometry) AS latitude
         FROM geo.places place CROSS JOIN point
        WHERE place.release_id = $1::uuid AND place.is_active AND place.boundary IS NOT NULL
          AND ($4::text IS NULL OR place.type = $4)
          AND place.boundary && point.geometry
          AND ST_Covers(place.boundary, point.geometry)
        ORDER BY place.depth DESC, ST_Area(place.boundary::geography) ASC
        LIMIT 20`,
      [releaseId, longitude, latitude, type ?? null]
    );
    return result.rows;
  }

  async createDraft(document: GeoImportDocument, checksum: string, actorId?: string): Promise<string> {
    const versionResult = await this.client.query<{ version: number }>(
      `SELECT COALESCE(MAX(version), 0) + 1 AS version FROM geo.releases
        WHERE tenant_id = current_setting('app.current_tenant_id')::uuid`
    );
    const version = Number(versionResult.rows[0]?.version ?? 1);
    const releaseResult = await this.client.query<{ id: string }>(
      `INSERT INTO geo.releases (tenant_id, version, checksum, source_metadata, created_by)
       VALUES (current_setting('app.current_tenant_id')::uuid, $1, $2, $3::jsonb, $4::uuid)
       RETURNING id`,
      [version, checksum, JSON.stringify(document.source), actorId ?? null]
    );
    const releaseId = releaseResult.rows[0]?.id;
    if (!releaseId) throw new Error("geo release insert returned no id");

    const placeIds = new Map<string, string>();
    const pending = [...document.places];
    while (pending.length) {
      const readyIndex = pending.findIndex((place) => !place.parentKey || placeIds.has(place.parentKey));
      if (readyIndex < 0) throw new Error("place hierarchy cannot be ordered");
      const [place] = pending.splice(readyIndex, 1);
      const center = place.center;
      const boundary = place.boundary ? JSON.stringify(asMultiPolygon(place.boundary)) : null;
      const result = await this.client.query<{ id: string }>(
        `INSERT INTO geo.places
           (tenant_id, release_id, external_key, parent_id, type, slug, name, aliases, center, boundary, sort_order, metadata)
         VALUES (
           current_setting('app.current_tenant_id')::uuid, $1::uuid, $2, $3::uuid, $4, $5, $6, $7::text[],
           CASE WHEN $8::double precision IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography END,
           CASE WHEN $10::text IS NULL THEN NULL ELSE ST_GeomFromGeoJSON($10)::geometry(MultiPolygon, 4326) END,
           $11, $12::jsonb
         ) RETURNING id`,
        [releaseId, place.key, place.parentKey ? placeIds.get(place.parentKey) : null, place.type, place.slug, place.name,
          place.aliases ?? [], center?.longitude ?? null, center?.latitude ?? null, boundary,
          place.sortOrder ?? 0, JSON.stringify(place.metadata ?? {})]
      );
      const placeId = result.rows[0]?.id;
      if (!placeId) throw new Error("place insert returned no id");
      placeIds.set(place.key, placeId);
      for (const identifier of place.identifiers ?? []) {
        await this.client.query(
          `INSERT INTO geo.place_identifiers (tenant_id, release_id, place_id, provider, external_id, metadata)
           VALUES (current_setting('app.current_tenant_id')::uuid, $1::uuid, $2::uuid, $3, $4, $5::jsonb)`,
          [releaseId, placeId, identifier.provider, identifier.externalId, JSON.stringify(identifier.metadata ?? {})]
        );
      }
    }
    await this.client.query(
      `INSERT INTO geo.import_jobs (tenant_id, release_id, checksum, source_name, status, counts, quality, created_by, finished_at)
       VALUES (current_setting('app.current_tenant_id')::uuid, $1::uuid, $2, $3, 'imported', $4::jsonb, $5::jsonb, $6::uuid, clock_timestamp())`,
      [releaseId, checksum, document.source.name, JSON.stringify({ places: document.places.length }),
        JSON.stringify({ withBoundary: document.places.filter((place) => place.boundary).length }), actorId ?? null]
    );
    return releaseId;
  }

  async publish(releaseId: string): Promise<void> {
    await this.client.query(
      `UPDATE geo.releases SET state = 'retired', retired_at = clock_timestamp()
        WHERE tenant_id = current_setting('app.current_tenant_id')::uuid AND state = 'published'`
    );
    const result = await this.client.query(
      `UPDATE geo.releases SET state = 'published', published_at = clock_timestamp()
        WHERE id = $1::uuid AND tenant_id = current_setting('app.current_tenant_id')::uuid AND state = 'draft'`,
      [releaseId]
    );
    if (result.rowCount !== 1) throw new Error("draft geo release was not found");
  }
}
