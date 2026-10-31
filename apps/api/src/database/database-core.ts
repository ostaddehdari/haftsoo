export type SqlRow = Record<string, unknown>;

export interface SqlResult<Row extends SqlRow = SqlRow> {
  rows: Row[];
  rowCount: number | null;
}

export interface SqlClient {
  query<Row extends SqlRow = SqlRow>(text: string, values?: unknown[]): Promise<SqlResult<Row>>;
}

export interface TransactionClient extends SqlClient {
  release(): void;
}

export interface SqlPool {
  connect(): Promise<TransactionClient>;
}

export interface TransactionContext {
  tenantId: string;
  statementTimeoutMs?: number;
  isolationLevel?: "read committed" | "repeatable read" | "serializable";
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isolationStatements = {
  "read committed": "BEGIN ISOLATION LEVEL READ COMMITTED",
  "repeatable read": "BEGIN ISOLATION LEVEL REPEATABLE READ",
  serializable: "BEGIN ISOLATION LEVEL SERIALIZABLE"
} as const;

export class PostgresUnitOfWork {
  constructor(private readonly pool: SqlPool) {}

  async run<Result>(context: TransactionContext, operation: (client: SqlClient) => Promise<Result>): Promise<Result> {
    if (!UUID_PATTERN.test(context.tenantId)) throw new Error("tenantId must be a UUID");
    const timeout = context.statementTimeoutMs ?? 1_000;
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 30_000) {
      throw new Error("statementTimeoutMs must be an integer between 1 and 30000");
    }
    const isolation = context.isolationLevel ?? "read committed";
    const client = await this.pool.connect();
    try {
      await client.query(isolationStatements[isolation]);
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [context.tenantId]);
      await client.query("SELECT set_config('statement_timeout', $1, true)", [`${timeout}ms`]);
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export interface ResourceRegistryRecord extends SqlRow {
  id: string;
  tenant_id: string;
  resource_type: string;
  external_key: string;
  version: number;
  attributes: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class ResourceRegistryRepository {
  constructor(private readonly client: SqlClient) {}

  async findActive(resourceType: string, externalKey: string): Promise<ResourceRegistryRecord | undefined> {
    const result = await this.client.query<ResourceRegistryRecord>(
      `SELECT id, tenant_id, resource_type, external_key, version, attributes,
              created_at, updated_at, deleted_at
         FROM platform.resource_registry
        WHERE resource_type = $1 AND external_key = $2 AND deleted_at IS NULL
        LIMIT 1`,
      [resourceType, externalKey]
    );
    return result.rows[0];
  }

  async create(resourceType: string, externalKey: string, attributes: Record<string, unknown>): Promise<ResourceRegistryRecord> {
    const result = await this.client.query<ResourceRegistryRecord>(
      `INSERT INTO platform.resource_registry (tenant_id, resource_type, external_key, attributes)
       VALUES (current_setting('app.current_tenant_id')::uuid, $1, $2, $3::jsonb)
       RETURNING id, tenant_id, resource_type, external_key, version, attributes,
                 created_at, updated_at, deleted_at`,
      [resourceType, externalKey, JSON.stringify(attributes)]
    );
    const created = result.rows[0];
    if (!created) throw new Error("resource insert returned no row");
    return created;
  }
}

export interface OutboxEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  payload: Record<string, unknown>;
  headers?: Record<string, unknown>;
}

export class OutboxRepository {
  constructor(private readonly client: SqlClient) {}

  async enqueue(event: OutboxEventInput): Promise<string> {
    if (!UUID_PATTERN.test(event.aggregateId)) throw new Error("aggregateId must be a UUID");
    const result = await this.client.query<{ id: string }>(
      `INSERT INTO platform.outbox_events
         (tenant_id, aggregate_type, aggregate_id, event_type, event_version, payload, headers)
       VALUES
         (current_setting('app.current_tenant_id')::uuid, $1, $2::uuid, $3, $4, $5::jsonb, $6::jsonb)
       RETURNING id`,
      [event.aggregateType, event.aggregateId, event.eventType, event.eventVersion,
        JSON.stringify(event.payload), JSON.stringify(event.headers ?? {})]
    );
    const id = result.rows[0]?.id;
    if (!id) throw new Error("outbox insert returned no id");
    return id;
  }
}

export class InboxRepository {
  constructor(private readonly client: SqlClient) {}

  async claim(consumer: string, eventId: string): Promise<boolean> {
    if (!UUID_PATTERN.test(eventId)) throw new Error("eventId must be a UUID");
    const result = await this.client.query<{ event_id: string }>(
      `INSERT INTO platform.inbox_receipts (consumer, event_id, tenant_id)
       VALUES ($1, $2::uuid, current_setting('app.current_tenant_id')::uuid)
       ON CONFLICT (consumer, event_id) DO NOTHING
       RETURNING event_id`,
      [consumer, eventId]
    );
    return result.rowCount === 1;
  }
}
