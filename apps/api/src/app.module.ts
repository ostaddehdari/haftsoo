import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { PlatformModule } from "./platform/platform.module";
import { SecurityModule } from "./security/security.module";

@Module({ imports: [DatabaseModule, HealthModule, PlatformModule, SecurityModule] })
export class AppModule {}
