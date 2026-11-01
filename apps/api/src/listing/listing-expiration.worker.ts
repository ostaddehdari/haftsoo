import { Inject, Injectable } from "@nestjs/common";
import type { PostgresUnitOfWork } from "../database/database-core";
import { UNIT_OF_WORK } from "../database/database.module";

export const LISTING_MAINTENANCE_POLICY={expireBatchSize:500,archiveRetentionDays:90,deletedRetentionDays:30} as const;
export function listingMaintenanceStatements(now=new Date()){
  return[
    {name:"expire",sql:`WITH due AS (SELECT id FROM listing.posts WHERE status IN ('published','paused') AND expires_at <= $1 ORDER BY expires_at FOR UPDATE SKIP LOCKED LIMIT $2) UPDATE listing.posts p SET status='expired',version=version+1,updated_at=clock_timestamp() FROM due WHERE p.id=due.id RETURNING p.id`,params:[now,LISTING_MAINTENANCE_POLICY.expireBatchSize]},
    {name:"purge",sql:`DELETE FROM listing.posts WHERE status='deleted' AND deleted_at < $1::timestamptz - interval '30 days' RETURNING id`,params:[now]}
  ];
}

@Injectable()
export class ListingExpirationWorker {
  constructor(@Inject(UNIT_OF_WORK) private readonly uow: PostgresUnitOfWork) {}
  async run(tenantId: string, now = new Date()) {
    return this.uow.run({ tenantId }, async (client) => {
      const counts: Record<string, number> = {};
      for (const statement of listingMaintenanceStatements(now)) {
        const result = await client.query(statement.sql, statement.params);
        counts[statement.name] = result.rowCount ?? 0;
      }
      return counts;
    });
  }
}
