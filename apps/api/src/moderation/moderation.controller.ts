import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ServiceAuthGuard } from "../security/service-auth.guard";
import type { ModerationInput } from "./moderation-core";
import { ModerationService } from "./moderation.service";

@Controller("moderation") @UseGuards(ServiceAuthGuard)
export class ModerationController { constructor(private readonly moderation: ModerationService) {} private wrap(data: unknown) { return { data, meta: { version: "v1" } }; }
  @Post("evaluate") async evaluate(@Headers("x-tenant-id") tenantId = "", @Body() body: ModerationInput & { assetIds?: string[] }) { return this.wrap(await this.moderation.evaluate(tenantId, body)); }
  @Get("queue") async queue(@Headers("x-tenant-id") tenantId = "", @Query("state") state?: string, @Query("limit") limit?: string) { return this.wrap(await this.moderation.queue(tenantId, state, Number(limit))); }
  @Post("cases/:id/decision") async decide(@Headers("x-tenant-id") tenantId = "", @Headers("x-actor-id") actorId = "", @Param("id") id: string, @Body() body: Record<string, unknown>) { return this.wrap(await this.moderation.decide(tenantId, actorId, id, body)); }
  @Post("cases/:id/appeal") async appeal(@Headers("x-tenant-id") tenantId = "", @Headers("x-actor-id") actorId = "", @Param("id") id: string, @Body() body: Record<string, unknown>) { return this.wrap(await this.moderation.appeal(tenantId, actorId, id, body)); }
  @Get("metrics") async metrics(@Headers("x-tenant-id") tenantId = "") { return this.wrap(await this.moderation.metrics(tenantId)); }
}
