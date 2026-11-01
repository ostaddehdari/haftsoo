import { Pool } from "pg";
import type { SearchInput } from "./search-core";

export class SavedSearchRepository {
  constructor(private readonly pool: Pool) {}

  async list(tenantId: string, userId: string) {
    const result = await this.pool.query(
      `SELECT id, name, query, alert_enabled, alert_frequency, last_notified_at, created_at
         FROM search.saved_searches WHERE tenant_id = $1::uuid AND user_id = $2::uuid AND deleted_at IS NULL
         ORDER BY created_at DESC`,
      [tenantId, userId]
    );
    return result.rows;
  }

  async create(tenantId: string, userId: string, name: string, query: SearchInput, alertEnabled: boolean, frequency: string) {
    const result = await this.pool.query(
      `INSERT INTO search.saved_searches (tenant_id, user_id, name, query, alert_enabled, alert_frequency)
       VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, $5, $6) RETURNING id, name, query, alert_enabled, alert_frequency, created_at`,
      [tenantId, userId, name, JSON.stringify(query), alertEnabled, frequency]
    );
    return result.rows[0];
  }

  async remove(tenantId: string, userId: string, id: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE search.saved_searches SET deleted_at = clock_timestamp(), updated_at = clock_timestamp()
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND user_id = $3::uuid AND deleted_at IS NULL`,
      [id, tenantId, userId]
    );
    return result.rowCount === 1;
  }
}
