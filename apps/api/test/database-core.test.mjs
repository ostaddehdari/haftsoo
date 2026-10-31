import assert from "node:assert/strict";
import test from "node:test";
import databaseCore from "../dist/database/database-core.js";

const { InboxRepository, OutboxRepository, PostgresUnitOfWork, ResourceRegistryRepository } = databaseCore;
const tenantId = "123e4567-e89b-42d3-a456-426614174000";
const eventId = "223e4567-e89b-42d3-a456-426614174000";

function mockTransaction(handler = async () => ({ rows: [], rowCount: 0 })) {
  const calls = [];
  const client = {
    async query(text, values = []) {
      calls.push({ text, values });
      return handler(text, values, calls);
    },
    release() { calls.push({ text: "RELEASE", values: [] }); }
  };
  return { calls, pool: { async connect() { return client; } } };
}

test("unit of work establishes tenant, timeout and commits", async () => {
  const { calls, pool } = mockTransaction();
  const unit = new PostgresUnitOfWork(pool);
  const result = await unit.run({ tenantId, statementTimeoutMs: 250, isolationLevel: "serializable" }, async () => "done");
  assert.equal(result, "done");
  assert.match(calls[0].text, /SERIALIZABLE/);
  assert.deepEqual(calls[1].values, [tenantId]);
  assert.deepEqual(calls[2].values, ["250ms"]);
  assert.equal(calls.at(-2).text, "COMMIT");
  assert.equal(calls.at(-1).text, "RELEASE");
});

test("unit of work rolls back and releases on failure", async () => {
  const { calls, pool } = mockTransaction();
  const unit = new PostgresUnitOfWork(pool);
  await assert.rejects(() => unit.run({ tenantId }, async () => { throw new Error("stop"); }), /stop/);
  assert.equal(calls.at(-2).text, "ROLLBACK");
  assert.equal(calls.at(-1).text, "RELEASE");
});

test("repositories parameterize values and preserve transaction client", async () => {
  const { calls, pool } = mockTransaction(async (text) => {
    if (text.includes("RETURNING id") && text.includes("outbox_events")) return { rows: [{ id: eventId }], rowCount: 1 };
    if (text.includes("RETURNING event_id")) return { rows: [{ event_id: eventId }], rowCount: 1 };
    if (text.includes("resource_registry") && text.includes("RETURNING id")) {
      return { rows: [{ id: eventId, tenant_id: tenantId, resource_type: "listing", external_key: "a-1", version: 1, attributes: {}, created_at: new Date(), updated_at: new Date(), deleted_at: null }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });
  const unit = new PostgresUnitOfWork(pool);
  await unit.run({ tenantId }, async (client) => {
    const resource = await new ResourceRegistryRepository(client).create("listing", "a-1", { state: "draft" });
    const queued = await new OutboxRepository(client).enqueue({ aggregateType: "listing", aggregateId: eventId, eventType: "listing.created", eventVersion: 1, payload: { id: eventId } });
    const claimed = await new InboxRepository(client).claim("search-indexer", eventId);
    assert.equal(resource.id, eventId);
    assert.equal(queued, eventId);
    assert.equal(claimed, true);
  });
  assert.equal(calls.some((call) => call.values.includes("a-1")), true);
  assert.equal(calls.some((call) => call.text.includes("ON CONFLICT")), true);
});

test("unit of work rejects unsafe tenant or timeout before connecting", async () => {
  let connected = false;
  const unit = new PostgresUnitOfWork({ async connect() { connected = true; throw new Error("unexpected"); } });
  await assert.rejects(() => unit.run({ tenantId: "not-a-uuid" }, async () => undefined), /UUID/);
  await assert.rejects(() => unit.run({ tenantId, statementTimeoutMs: 60_000 }, async () => undefined), /30000/);
  assert.equal(connected, false);
});
