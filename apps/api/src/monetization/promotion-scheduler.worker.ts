import { Injectable } from "@nestjs/common";
import { promotionWindow } from "./monetization-core";

@Injectable()
export class PromotionSchedulerWorker {
  schedule(startsAt: Date, durationMinutes: number) { return promotionWindow(startsAt, durationMinutes); }
  readonly lock = "pg_try_advisory_xact_lock(hashtext('monetization-promotion-scheduler'))";
}
