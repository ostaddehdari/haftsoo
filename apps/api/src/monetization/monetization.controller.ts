import { Body, Controller, Get, Headers, Post, Query, UseGuards } from "@nestjs/common";
import { ServiceAuthGuard } from "../security/service-auth.guard";
import { MonetizationService } from "./monetization.service";

@Controller("monetization")
@UseGuards(ServiceAuthGuard)
export class MonetizationController {
  constructor(private readonly service: MonetizationService) {}
  private wrap(data: unknown) { return { data, meta: { version: "v1", currency: "IRR" } }; }
  @Get("products") products(@Headers("x-tenant-id") tenant = "", @Query("audience") audience?: string) { return this.service.products(tenant, audience).then(data => this.wrap(data)); }
  @Get("purchases") purchases(@Headers("x-tenant-id") tenant = "", @Headers("x-user-id") user = "", @Query("limit") limit?: string) { return this.service.purchases(tenant, user, Number(limit)).then(data => this.wrap(data)); }
  @Get("entitlements") entitlements(@Headers("x-tenant-id") tenant = "", @Headers("x-user-id") user = "") { return this.service.entitlements(tenant, user).then(data => this.wrap(data)); }
  @Post("orders") order(@Headers("x-tenant-id") tenant = "", @Headers("x-user-id") user = "", @Body() body: Record<string, unknown>) { return this.service.createOrder(tenant, user, body).then(data => this.wrap(data)); }
  @Post("internal/fulfill") fulfill(@Headers("x-tenant-id") tenant = "", @Body() body: Record<string, unknown>) { return this.service.fulfill(tenant, String(body.orderId ?? ""), String(body.paymentIntentId ?? "")).then(data => this.wrap(data)); }
  @Get("admin/metrics") metrics(@Headers("x-tenant-id") tenant = "") { return this.service.metrics(tenant).then(data => this.wrap(data)); }
}
