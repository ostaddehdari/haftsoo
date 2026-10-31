import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { PlatformModule } from "./platform/platform.module";

@Module({ imports: [HealthModule, PlatformModule] })
export class AppModule {}
