import { Module } from "@nestjs/common";
import { GeoAdminController, GeoController } from "./geo.controller";
import { GeoService } from "./geo.service";

@Module({ controllers: [GeoController, GeoAdminController], providers: [GeoService] })
export class GeoModule {}
