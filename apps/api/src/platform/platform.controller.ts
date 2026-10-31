import { Controller, Get, Headers } from "@nestjs/common";

@Controller("platform")
export class PlatformController {
  @Get()
  describe(@Headers("x-request-id") requestId = "not-provided") {
    return {
      data: { name: "haftsoo", locale: "fa-IR", direction: "rtl" },
      meta: { requestId, version: "v1" }
    };
  }
}
