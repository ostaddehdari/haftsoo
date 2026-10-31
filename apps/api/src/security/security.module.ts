import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { SecurityRateLimitGuard } from "./rate-limit.guard";
import { SecurityController } from "./security.controller";
import { SecurityHeadersInterceptor } from "./security-headers.interceptor";
import { ServiceAuthGuard } from "./service-auth.guard";

@Module({
  controllers: [SecurityController],
  providers: [
    ServiceAuthGuard,
    SecurityRateLimitGuard,
    { provide: APP_INTERCEPTOR, useClass: SecurityHeadersInterceptor }
  ]
})
export class SecurityModule {}
