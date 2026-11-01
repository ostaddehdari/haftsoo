import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { DATABASE_POOL } from "../database/database.module";
import { OpenSearchClient } from "./opensearch.client";
import { buildSearchQuery, buildSuggestionQuery, encodeCursor, SearchInput, validateSearchInput } from "./search-core";
import { SavedSearchRepository } from "./search.repository";

interface OpenSearchHit { _id: string; _score: number; _source: Record<string, unknown>; sort?: unknown[] }
interface OpenSearchResult { took: number; hits: { total: { value: number } | number; hits: OpenSearchHit[] }; aggregations?: Record<string, { buckets: Array<{ key: string; doc_count: number }> }> }

@Injectable()
export class SearchService {
  private readonly saved: SavedSearchRepository;
  constructor(private readonly client: OpenSearchClient, @Inject(DATABASE_POOL) pool: Pool) {
    this.saved = new SavedSearchRepository(pool);
  }

  async search(input: SearchInput, tenantId: string) {
    const result = await this.client.search<OpenSearchResult>(buildSearchQuery(input, tenantId));
    const hits = result.hits.hits;
    const total = typeof result.hits.total === "number" ? result.hits.total : result.hits.total.value;
    const facets = Object.fromEntries(Object.entries(result.aggregations ?? {}).map(([key, value]) => [key, value.buckets.map((bucket) => ({ value: bucket.key, count: bucket.doc_count }))]));
    return {
      items: hits.map((hit) => ({ id: hit._id, score: hit._score, ...hit._source })),
      total,
      nextCursor: hits.at(-1)?.sort ? encodeCursor(hits.at(-1)?.sort ?? []) : undefined,
      facets,
      tookMs: result.took
    };
  }

  async suggest(query: string, tenantId: string, limit: number) {
    const result = await this.client.search<OpenSearchResult>(buildSuggestionQuery(query, tenantId, limit));
    return result.hits.hits.map((hit) => ({ text: String(hit._source.title_display ?? hit._source.title), categorySlug: hit._source.category_slug, score: hit._score }));
  }

  listSaved(tenantId: string, userId: string) { return this.saved.list(tenantId, userId); }
  createSaved(tenantId: string, userId: string, body: { name: string; query: SearchInput; alertEnabled?: boolean; frequency?: string }) {
    const name = String(body.name ?? "").trim().slice(0, 80);
    if (!name) throw new Error("saved search name is required");
    const frequency = body.frequency ?? "instant";
    if (!["instant", "daily", "weekly"].includes(frequency)) throw new Error("invalid alert frequency");
    return this.saved.create(tenantId, userId, name, validateSearchInput(body.query), body.alertEnabled ?? false, frequency);
  }
  removeSaved(tenantId: string, userId: string, id: string) { return this.saved.remove(tenantId, userId, id); }
}
