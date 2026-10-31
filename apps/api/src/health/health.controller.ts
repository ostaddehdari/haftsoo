import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      status: "ok",
      service: "haftsoo-api",
      version: "0.3.0",
      timestamp: new Date().toISOString()
    };
  }
}
