import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { PlatformModule } from "./platform/platform.module";
import { SecurityModule } from "./security/security.module";

@Module({ imports: [HealthModule, PlatformModule, SecurityModule] })
export class AppModule {}
