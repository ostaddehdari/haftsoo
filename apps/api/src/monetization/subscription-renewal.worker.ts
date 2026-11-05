import { Injectable } from "@nestjs/common";
import { subscriptionPeriod } from "./monetization-core";

@Injectable()
export class SubscriptionRenewalWorker {
  nextPeriod(startsAt: Date, months = 1) { return subscriptionPeriod(startsAt, months); }
  readonly selection = "FOR UPDATE SKIP LOCKED";
  readonly retryStates = ["active", "past_due"] as const;
}
