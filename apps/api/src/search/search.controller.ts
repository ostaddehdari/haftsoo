import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ServiceAuthGuard } from "../security/service-auth.guard";
import type { SearchInput } from "./search-core";
import { SearchService } from "./search.service";

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} header is required`);
  return value;
}

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  async search(@Headers("x-tenant-id") tenantId: string | undefined, @Body() body: SearchInput, @Headers("x-request-id") requestId = "not-provided") {
    return { data: await this.searchService.search(body, required(tenantId, "x-tenant-id")), meta: { requestId, version: "v1" } };
  }

  @Get("suggestions")
  async suggestions(@Headers("x-tenant-id") tenantId: string | undefined, @Query("q") query = "", @Query("limit") limit = "8") {
    return { data: await this.searchService.suggest(query, required(tenantId, "x-tenant-id"), Number(limit)), meta: { version: "v1" } };
  }

}

@Controller("search/saved")
@UseGuards(ServiceAuthGuard)
export class SavedSearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async saved(@Headers("x-tenant-id") tenantId: string | undefined, @Headers("x-user-id") userId: string | undefined) {
    return { data: await this.searchService.listSaved(required(tenantId, "x-tenant-id"), required(userId, "x-user-id")), meta: { version: "v1" } };
  }

  @Post()
  async save(@Headers("x-tenant-id") tenantId: string | undefined, @Headers("x-user-id") userId: string | undefined, @Body() body: { name: string; query: SearchInput; alertEnabled?: boolean; frequency?: string }) {
    return { data: await this.searchService.createSaved(required(tenantId, "x-tenant-id"), required(userId, "x-user-id"), body), meta: { version: "v1" } };
  }

  @Delete(":id")
  async remove(@Headers("x-tenant-id") tenantId: string | undefined, @Headers("x-user-id") userId: string | undefined, @Param("id") id: string) {
    return { data: { deleted: await this.searchService.removeSaved(required(tenantId, "x-tenant-id"), required(userId, "x-user-id"), id) }, meta: { version: "v1" } };
  }
}
