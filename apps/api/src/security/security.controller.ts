import { Controller, Get, UseGuards } from "@nestjs/common";
import { SecurityRateLimitGuard } from "./rate-limit.guard";
import { ServiceAuthGuard } from "./service-auth.guard";

@Controller("security")
export class SecurityController {
  @Get("baseline")
  baseline() {
    return {
      data: {
        version: "2026-10-31",
        principalTypes: ["anonymous", "user", "business", "workforce", "service"],
        capabilities: ["authorization", "device-trust", "service-auth", "rate-limit", "audit-chain"]
      }
    };
  }

  @Get("service-auth-check")
  @UseGuards(SecurityRateLimitGuard, ServiceAuthGuard)
  serviceAuthCheck() {
    return { data: { authenticated: true } };
  }
}
