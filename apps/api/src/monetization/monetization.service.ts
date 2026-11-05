import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { PostgresUnitOfWork } from "../database/database-core";
import { UNIT_OF_WORK } from "../database/database.module";
import { idempotencyKey } from "../finance/finance-core";
import { FinanceService } from "../finance/finance.service";
import { MonetizationRepository } from "./monetization.repository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable()
export class MonetizationService {
  constructor(@Inject(UNIT_OF_WORK) private readonly uow: PostgresUnitOfWork, private readonly finance: FinanceService) {}
  private id(value: string) { if (!UUID.test(value)) throw new BadRequestException({ code: "monetization_identity_invalid" }); return value; }
  products(tenantId: string, audience = "personal") { this.id(tenantId); return this.uow.run({ tenantId }, client => new MonetizationRepository(client).products(["personal", "business", "all"].includes(audience) ? audience : "personal")); }
  purchases(tenantId: string, userId: string, limit = 50) { this.id(tenantId); this.id(userId); return this.uow.run({ tenantId }, client => new MonetizationRepository(client).purchases(userId, Math.min(Math.max(limit || 50, 1), 100))); }
  entitlements(tenantId: string, userId: string) { this.id(tenantId); this.id(userId); return this.uow.run({ tenantId }, client => new MonetizationRepository(client).entitlements(userId)); }
  async createOrder(tenantId: string, userId: string, raw: Record<string, unknown>) { this.id(tenantId); this.id(userId); const priceId = this.id(String(raw.priceId ?? "")); const businessId = raw.businessId ? this.id(String(raw.businessId)) : undefined; const listingId = raw.listingId ? this.id(String(raw.listingId)) : undefined; const quantity = Number(raw.quantity ?? 1); if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new BadRequestException({ code: "monetization_quantity_invalid" }); let key: string; try { key = idempotencyKey(raw.idempotencyKey); } catch (error) { throw new BadRequestException({ code: (error as Error).message }); } const coupon = String(raw.coupon ?? "").trim().toUpperCase().slice(0, 32); const order = await this.uow.run({ tenantId, isolationLevel: "serializable" }, client => new MonetizationRepository(client).createOrder({ userId, businessId, listingId, priceId, quantity, key, coupon })); if (!order?.id) throw new BadRequestException({ code: businessId ? "monetization_business_billing_forbidden" : coupon ? "monetization_coupon_invalid" : "monetization_price_unavailable" }); if (order.payment_intent_id) return order; const intent = await this.finance.createIntent(tenantId, userId, { amount: Number(order.total), purpose: `monetization_order:${order.id}`, idempotencyKey: `monetization:${order.id}` }); return this.uow.run({ tenantId, isolationLevel: "serializable" }, client => new MonetizationRepository(client).attachPayment(String(order.id), String(intent.id))); }
  metrics(tenantId: string) { this.id(tenantId); return this.uow.run({ tenantId }, client => new MonetizationRepository(client).metrics()); }
  fulfill(tenantId: string, orderId: string, paymentIntentId: string) { this.id(tenantId); this.id(orderId); this.id(paymentIntentId); return this.uow.run({ tenantId, isolationLevel: "serializable" }, client => new MonetizationRepository(client).activate(orderId, paymentIntentId)); }
}
