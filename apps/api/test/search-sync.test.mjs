import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";

const moduleUrl = pathToFileURL(new URL("../dist/search/index-sync.worker.js", import.meta.url).pathname);
const { SearchIndexSync } = await import(moduleUrl);

test("bulk pipeline emits idempotent upsert and delete operations", () => {
  const sync = new SearchIndexSync({ bulk: async () => ({ errors: false, items: [] }) });
  const body = sync.toBulkBody([
    { id: "p1", operation: "upsert", post: { id: "p1", tenantId: "t1", title: "خانه", description: "آگهی", categorySlug: "real-estate", cityId: "4", attributes: {}, status: "active", publishedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" } },
    { id: "p2", operation: "delete" }
  ]);
  assert.match(body, /haftsoo-posts-write/);
  assert.match(body, /"_id":"p1"/);
  assert.match(body, /"delete"/);
  assert.ok(body.endsWith("\n"));
});

test("bulk pipeline fails closed on partial OpenSearch errors", async () => {
  const sync = new SearchIndexSync({ bulk: async () => ({ errors: true, items: [] }) });
  await assert.rejects(() => sync.synchronize([{ id: "p2", operation: "delete" }]), /failed items/);
});
