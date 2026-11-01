import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";

const moduleUrl = pathToFileURL(new URL("../dist/search/search-core.js", import.meta.url).pathname);
const { buildSearchQuery, buildSuggestionQuery, decodeCursor, encodeCursor, normalizePersian, projectPost, validateSearchInput } = await import(moduleUrl);

test("Persian normalization unifies Arabic characters and whitespace", () => {
  assert.equal(normalizePersian("  گوشيِ  سامسونگ كاربرده  "), "گوشی سامسونگ کاربرده");
  assert.equal(normalizePersian("آپارتمان"), "اپارتمان");
});

test("query DSL isolates tenant and binds dynamic filters", () => {
  const query = buildSearchQuery({ query: "خانه", cityIds: ["4"], categorySlug: "real-estate", filters: { rooms: { gte: 2 }, furnished: { eq: true } }, sort: "price-asc", limit: 200 }, "tenant-a");
  assert.equal(query.size, 50);
  const serialized = JSON.stringify(query);
  assert.match(serialized, /tenant-a/);
  assert.match(serialized, /attributes\.rooms/);
  assert.match(serialized, /attributes\.furnished/);
  assert.match(serialized, /function_score/);
});

test("cursor codec is stable and rejects malformed cursors", () => {
  const cursor = encodeCursor([7.2, "2026-01-01T00:00:00Z", "post-1"]);
  assert.deepEqual(decodeCursor(cursor), [7.2, "2026-01-01T00:00:00Z", "post-1"]);
  assert.throws(() => decodeCursor("not-json"), /invalid search cursor/);
});

test("suggestions and projections use normalized searchable text", () => {
  const suggestion = buildSuggestionQuery("گوشي", "tenant-a", 100);
  assert.equal(suggestion.size, 20);
  const projection = projectPost({ id: "p1", tenantId: "t1", title: "گوشي كاربرده", description: "توضیحات", categorySlug: "mobile", cityId: "4", attributes: {}, status: "active", publishedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" });
  assert.equal(projection.title, "گوشی کاربرده");
});

test("input validation blocks arbitrary filter paths", () => {
  assert.throws(() => validateSearchInput({ filters: { "bad.path": { eq: 1 } } }), /invalid filter key/);
});
