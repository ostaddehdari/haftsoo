import { Module } from "@nestjs/common";
import { CatalogModule } from "./catalog/catalog.module";
import { DatabaseModule } from "./database/database.module";
import { GeoModule } from "./geo/geo.module";
import { HealthModule } from "./health/health.module";
import { ListingModule } from "./listing/listing.module";
import { MediaModule } from "./media/media.module";
import { PlatformModule } from "./platform/platform.module";
import { SearchModule } from "./search/search.module";
import { SecurityModule } from "./security/security.module";
import { SubmissionModule } from "./submission/submission.module";

@Module({ imports: [CatalogModule, DatabaseModule, GeoModule, HealthModule, ListingModule, MediaModule, PlatformModule, SearchModule, SecurityModule, SubmissionModule] })
export class AppModule {}
