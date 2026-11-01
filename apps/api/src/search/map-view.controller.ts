import { BadRequestException, Body, Controller, Headers, Post } from "@nestjs/common";
import type { MapViewportInput } from "./map-view-core";
import { MapViewService } from "./map-view.service";

@Controller("map")
export class MapViewController {
  constructor(private readonly mapView: MapViewService) {}

  @Post("viewport")
  async viewport(@Headers("x-tenant-id") tenantId: string | undefined, @Body() body: MapViewportInput, @Headers("x-request-id") requestId = "not-provided") {
    if (!tenantId) throw new BadRequestException("x-tenant-id header is required");
    return { data: await this.mapView.viewport(body, tenantId), meta: { requestId, version: "v1" } };
  }
}
