import { Global, Inject, Injectable, Module, OnApplicationShutdown } from "@nestjs/common";
import { existsSync, readFileSync } from "node:fs";
import { Pool, PoolClient, PoolConfig, QueryResultRow } from "pg";
import { PostgresUnitOfWork, SqlPool, SqlResult, TransactionClient } from "./database-core";

export const DATABASE_POOL = Symbol("DATABASE_POOL");
export const UNIT_OF_WORK = Symbol("UNIT_OF_WORK");

function readSecret(path: string | undefined): string | undefined {
  return path && existsSync(path) ? readFileSync(path, "utf8").trim() : undefined;
}

export function databaseConfig(environment: NodeJS.ProcessEnv = process.env): PoolConfig {
  const connectionString = environment.DATABASE_URL ?? readSecret(environment.DATABASE_URL_FILE);
  if (connectionString) return { connectionString, max: 20, idleTimeoutMillis: 30_000 };
  return {
    host: environment.POSTGRES_HOST ?? "127.0.0.1",
    port: Number(environment.POSTGRES_PORT ?? 5432),
    database: environment.POSTGRES_DB ?? "haftsoo",
    user: environment.POSTGRES_USER ?? "haftsoo",
    password: environment.POSTGRES_PASSWORD ?? readSecret(environment.POSTGRES_PASSWORD_FILE),
    max: 20,
    idleTimeoutMillis: 30_000
  };
}

class PgTransactionClient implements TransactionClient {
  constructor(private readonly client: PoolClient) {}

  async query<Row extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: unknown[]): Promise<SqlResult<Row>> {
    const result = await this.client.query<Row & QueryResultRow>(text, values);
    return { rows: result.rows, rowCount: result.rowCount };
  }

  release(): void {
    this.client.release();
  }
}

class PgPoolAdapter implements SqlPool {
  constructor(private readonly pool: Pool) {}

  async connect(): Promise<TransactionClient> {
    return new PgTransactionClient(await this.pool.connect());
  }
}

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    { provide: DATABASE_POOL, useFactory: () => new Pool(databaseConfig()) },
    {
      provide: UNIT_OF_WORK,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new PostgresUnitOfWork(new PgPoolAdapter(pool))
    },
    DatabaseLifecycle
  ],
  exports: [DATABASE_POOL, UNIT_OF_WORK]
})
export class DatabaseModule {}
