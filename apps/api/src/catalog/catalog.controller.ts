import { Body, Controller, Get, Headers, Param, Post, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { ServiceAuthGuard } from "../security/service-auth.guard";
import type { CatalogImportDocument } from "./catalog-core";
import { CatalogService } from "./catalog.service";

function tenant(headersTenant: string | undefined): string {
  return headersTenant ?? "";
}

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("categories/tree")
  async tree(@Headers("x-tenant-id") tenantId: string | undefined, @Headers("x-request-id") requestId = "not-provided", @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.catalog.tree(tenant(tenantId));
    reply.header("cache-control", "public, max-age=60, stale-while-revalidate=300");
    reply.header("etag", `\"catalog-${result.release.checksum}\"`);
    return { data: result.categories, meta: { requestId, version: "v1", catalogVersion: result.release.version } };
  }

  @Get("categories/:slug/form")
  async form(@Headers("x-tenant-id") tenantId: string | undefined, @Param("slug") slug: string, @Headers("x-request-id") requestId = "not-provided", @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.catalog.form(tenant(tenantId), slug);
    reply.header("cache-control", "public, max-age=60, stale-while-revalidate=300");
    reply.header("etag", `\"catalog-${result.release.checksum}-${slug}\"`);
    return { data: { slug, fields: result.fields }, meta: { requestId, version: "v1", catalogVersion: result.release.version } };
  }
}

@Controller("admin/catalog")
@UseGuards(ServiceAuthGuard)
export class CatalogAdminController {
  constructor(private readonly catalog: CatalogService) {}

  @Post("validate")
  validate(@Body() document: CatalogImportDocument) {
    return { data: this.catalog.validate(document), meta: { version: "v1" } };
  }

  @Post("imports")
  async importDraft(@Headers("x-tenant-id") tenantId: string | undefined, @Headers("x-actor-id") actorId: string | undefined, @Body() document: CatalogImportDocument) {
    return { data: await this.catalog.importDraft(tenant(tenantId), document, actorId), meta: { version: "v1" } };
  }

  @Post("releases/:releaseId/publish")
  async publish(@Headers("x-tenant-id") tenantId: string | undefined, @Param("releaseId") releaseId: string) {
    return { data: await this.catalog.publish(tenant(tenantId), releaseId), meta: { version: "v1" } };
  }
}
