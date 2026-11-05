import { Module } from "@nestjs/common";
import { SecurityModule } from "../security/security.module";
import { FinanceModule } from "../finance/finance.module";
import { MonetizationController } from "./monetization.controller";
import { MonetizationService } from "./monetization.service";
import { PromotionSchedulerWorker } from "./promotion-scheduler.worker";
import { SubscriptionRenewalWorker } from "./subscription-renewal.worker";

@Module({ imports: [FinanceModule, SecurityModule], controllers: [MonetizationController], providers: [MonetizationService, PromotionSchedulerWorker, SubscriptionRenewalWorker], exports: [MonetizationService, PromotionSchedulerWorker, SubscriptionRenewalWorker] })
export class MonetizationModule {}
