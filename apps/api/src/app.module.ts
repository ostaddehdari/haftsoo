import { Module } from "@nestjs/common";
import { CatalogModule } from "./catalog/catalog.module";
import { DatabaseModule } from "./database/database.module";
import { GeoModule } from "./geo/geo.module";
import { HealthModule } from "./health/health.module";
import { PlatformModule } from "./platform/platform.module";
import { SecurityModule } from "./security/security.module";

@Module({ imports: [CatalogModule, DatabaseModule, GeoModule, HealthModule, PlatformModule, SecurityModule] })
export class AppModule {}
