import { Body, Controller, DefaultValuePipe, Get, Headers, Param, ParseFloatPipe, ParseIntPipe, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { ServiceAuthGuard } from "../security/service-auth.guard";
import type { GeoImportDocument } from "./geo-core";
import { GeoService } from "./geo.service";

const tenant = (value: string | undefined) => value ?? "";

@Controller("geo")
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get("places")
  async children(@Headers("x-tenant-id") tenantId: string | undefined, @Query("parentKey") parentKey?: string, @Query("type") type?: string,
    @Headers("x-request-id") requestId = "not-provided", @Res({ passthrough: true }) reply?: FastifyReply) {
    const result = await this.geo.children(tenant(tenantId), parentKey, type);
    this.cache(reply, result.release.checksum, `children-${parentKey ?? "root"}-${type ?? "all"}`);
    return { data: result.data, meta: { requestId, version: "v1", geoVersion: result.release.version } };
  }

  @Get("hierarchy")
  async hierarchy(@Headers("x-tenant-id") tenantId: string | undefined, @Query("provinceKey") provinceKey?: string,
    @Headers("x-request-id") requestId = "not-provided", @Res({ passthrough: true }) reply?: FastifyReply) {
    const result = await this.geo.hierarchy(tenant(tenantId), provinceKey);
    this.cache(reply, result.release.checksum, `hierarchy-${provinceKey ?? "all"}`, 900);
    return { data: result.data, meta: { requestId, version: "v1", geoVersion: result.release.version } };
  }

  @Get("places/:key")
  async place(@Headers("x-tenant-id") tenantId: string | undefined, @Param("key") key: string,
    @Headers("x-request-id") requestId = "not-provided", @Res({ passthrough: true }) reply?: FastifyReply) {
    const result = await this.geo.place(tenant(tenantId), key);
    this.cache(reply, result.release.checksum, `place-${key}`);
    return { data: result.data, meta: { requestId, version: "v1", geoVersion: result.release.version } };
  }

  @Get("places/:key/boundary")
  async boundary(@Headers("x-tenant-id") tenantId: string | undefined, @Param("key") key: string,
    @Query("precision") precision: "full" | "simplified" = "simplified", @Headers("x-request-id") requestId = "not-provided",
    @Res({ passthrough: true }) reply?: FastifyReply) {
    const result = await this.geo.boundary(tenant(tenantId), key, precision);
    this.cache(reply, result.release.checksum, `boundary-${key}-${precision}`, 3600);
    return { data: result.data, meta: { requestId, version: "v1", geoVersion: result.release.version } };
  }

  @Get("search")
  async search(@Headers("x-tenant-id") tenantId: string | undefined, @Query("q") query: string,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number, @Headers("x-request-id") requestId = "not-provided") {
    const result = await this.geo.search(tenant(tenantId), query ?? "", limit);
    return { data: result.data, meta: { requestId, version: "v1", geoVersion: result.release.version } };
  }

  @Get("resolve")
  async resolve(@Headers("x-tenant-id") tenantId: string | undefined, @Query("longitude", ParseFloatPipe) longitude: number,
    @Query("latitude", ParseFloatPipe) latitude: number, @Query("type") type?: string,
    @Headers("x-request-id") requestId = "not-provided") {
    const result = await this.geo.resolvePoint(tenant(tenantId), longitude, latitude, type);
    return { data: result.data, meta: { requestId, version: "v1", geoVersion: result.release.version } };
  }

  private cache(reply: FastifyReply | undefined, checksum: string, variant: string, maxAge = 300): void {
    reply?.header("cache-control", `public, max-age=${maxAge}, stale-while-revalidate=3600`);
    reply?.header("etag", `\"geo-${checksum}-${variant}\"`);
  }
}

@Controller("admin/geo")
@UseGuards(ServiceAuthGuard)
export class GeoAdminController {
  constructor(private readonly geo: GeoService) {}

  @Post("validate")
  validate(@Body() document: GeoImportDocument) {
    return { data: this.geo.validate(document), meta: { version: "v1" } };
  }

  @Post("imports")
  async importDraft(@Headers("x-tenant-id") tenantId: string | undefined, @Headers("x-actor-id") actorId: string | undefined, @Body() document: GeoImportDocument) {
    return { data: await this.geo.importDraft(tenant(tenantId), document, actorId), meta: { version: "v1" } };
  }

  @Post("releases/:releaseId/publish")
  async publish(@Headers("x-tenant-id") tenantId: string | undefined, @Param("releaseId") releaseId: string) {
    return { data: await this.geo.publish(tenant(tenantId), releaseId), meta: { version: "v1" } };
  }
}
