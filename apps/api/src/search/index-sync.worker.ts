import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { DATABASE_POOL } from "../database/database.module";
import { OpenSearchClient } from "./opensearch.client";
import { PostProjection, projectPost } from "./search-core";

export interface SearchIndexEvent { id: string; operation: "upsert" | "delete"; post?: PostProjection }

@Injectable()
export class SearchIndexSync {
  constructor(private readonly client: OpenSearchClient, @Inject(DATABASE_POOL) private readonly pool: Pool) {}

  toBulkBody(events: readonly SearchIndexEvent[]): string {
    const lines: string[] = [];
    for (const event of events) {
      if (event.operation === "delete") {
        lines.push(JSON.stringify({ delete: { _index: "haftsoo-posts-write", _id: event.id } }));
        continue;
      }
      if (!event.post) throw new Error(`upsert event ${event.id} has no post projection`);
      lines.push(JSON.stringify({ index: { _index: "haftsoo-posts-write", _id: event.id } }));
      lines.push(JSON.stringify(projectPost(event.post)));
    }
    return `${lines.join("\n")}\n`;
  }

  async synchronize(events: readonly SearchIndexEvent[]): Promise<number> {
    if (!events.length) return 0;
    const result = await this.client.bulk(this.toBulkBody(events));
    if (result.errors) throw new Error("OpenSearch bulk synchronization contains failed items");
    return events.length;
  }

  async runOutboxBatch(tenantId: string, batchSize = 100): Promise<number> {
    const connection = await this.pool.connect();
    try {
      await connection.query("BEGIN");
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
      const result = await connection.query<{ id: string; aggregate_id: string; event_type: string; payload: Record<string, unknown> }>(
        `SELECT id, aggregate_id, event_type, payload
           FROM platform.outbox_events
          WHERE tenant_id = $1::uuid AND published_at IS NULL AND available_at <= clock_timestamp()
            AND event_type IN ('listing.post.upserted', 'listing.post.deleted')
          ORDER BY occurred_at, id FOR UPDATE SKIP LOCKED LIMIT $2`,
        [tenantId, Math.min(Math.max(batchSize, 1), 500)]
      );
      const events = result.rows.map((row) => row.event_type.endsWith("deleted")
        ? { id: row.aggregate_id, operation: "delete" as const }
        : { id: row.aggregate_id, operation: "upsert" as const, post: row.payload.post as unknown as PostProjection });
      await this.synchronize(events);
      for (const row of result.rows) {
        await connection.query(
          `INSERT INTO platform.inbox_receipts (consumer, event_id, tenant_id, processed_at)
           VALUES ('search-index-v1', $1::uuid, $2::uuid, clock_timestamp()) ON CONFLICT DO NOTHING`,
          [row.id, tenantId]
        );
        await connection.query(
          "UPDATE platform.outbox_events SET published_at = clock_timestamp(), attempts = attempts + 1 WHERE id = $1::uuid AND tenant_id = $2::uuid",
          [row.id, tenantId]
        );
      }
      await connection.query(
        `INSERT INTO search.index_checkpoints (consumer_name, last_event_id, last_event_at, indexed_count)
         VALUES ('search-index-v1:' || $1, $2::uuid, clock_timestamp(), $3)
         ON CONFLICT (consumer_name) DO UPDATE SET last_event_id = EXCLUDED.last_event_id, last_event_at = EXCLUDED.last_event_at,
           indexed_count = search.index_checkpoints.indexed_count + EXCLUDED.indexed_count, updated_at = clock_timestamp()`,
        [tenantId, result.rows.at(-1)?.id ?? null, events.length]
      );
      await connection.query("COMMIT");
      return events.length;
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
  }
}
