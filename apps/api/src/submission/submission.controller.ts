import { Body, Controller, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import type { SubmissionDraftPayload, SubmissionStep } from "./submission-core";
import { SubmissionService } from "./submission.service";

@Controller("submissions")
export class SubmissionController {
  constructor(private readonly submissions: SubmissionService) {}
  private context(tenantId = "", actorId = "") { return { tenantId, actorId }; }

  @Post("drafts")
  async create(@Headers("x-tenant-id") tenantId?: string, @Headers("x-actor-id") actorId?: string) {
    return { data: await this.submissions.create(tenantId ?? "", actorId ?? ""), meta: { version: "v1" } };
  }

  @Get("drafts/:id")
  async get(@Param("id") id: string, @Headers("x-tenant-id") tenantId?: string, @Headers("x-actor-id") actorId?: string) {
    const context = this.context(tenantId, actorId);
    return { data: await this.submissions.get(context.tenantId, context.actorId, id), meta: { version: "v1" } };
  }

  @Patch("drafts/:id")
  async save(@Param("id") id: string, @Headers("x-tenant-id") tenantId: string | undefined, @Headers("x-actor-id") actorId: string | undefined, @Body() body: { revision: number; currentStep: SubmissionStep; payload: SubmissionDraftPayload }) {
    return { data: await this.submissions.save(tenantId ?? "", actorId ?? "", id, body), meta: { version: "v1" } };
  }

  @Post("drafts/:id/preview")
  async preview(@Param("id") id: string, @Headers("x-tenant-id") tenantId?: string, @Headers("x-actor-id") actorId?: string) {
    return { data: await this.submissions.preview(tenantId ?? "", actorId ?? "", id), meta: { version: "v1" } };
  }

  @Post("drafts/:id/submit")
  async submit(@Param("id") id: string, @Headers("x-tenant-id") tenantId: string | undefined, @Headers("x-actor-id") actorId: string | undefined, @Headers("idempotency-key") key = "") {
    return { data: await this.submissions.submit(tenantId ?? "", actorId ?? "", id, key), meta: { version: "v1" } };
  }
}
