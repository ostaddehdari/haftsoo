import { Module } from "@nestjs/common";
import { CatalogAdminController, CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({ controllers: [CatalogController, CatalogAdminController], providers: [CatalogService] })
export class CatalogModule {}
