import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { NonceReplayGuard, verifyServiceSignature } from "./security-core";
import type { ServiceSignatureInput } from "./security-core";

interface RequestShape {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  private readonly replay = new NonceReplayGuard();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestShape>();
    const keyFile = process.env.SERVICE_AUTH_KEY_FILE;
    if (!keyFile) throw new UnauthorizedException("service credential is unavailable");

    const service = this.header(request, "x-haftsoo-service");
    const timestampText = this.header(request, "x-haftsoo-timestamp");
    const nonce = this.header(request, "x-haftsoo-nonce");
    const signature = this.header(request, "x-haftsoo-signature");
    const timestamp = Number(timestampText);
    const input: ServiceSignatureInput = {
      service,
      method: request.method,
      path: request.url.split("?", 1)[0],
      timestamp,
      nonce
    };
    const allowed = new Set((process.env.TRUSTED_SERVICE_NAMES ?? "web,api,chat").split(",").map((item) => item.trim()));
    const key = readFileSync(keyFile, "utf8").trim();
    const valid = verifyServiceSignature(input, signature, key, allowed);
    const fresh = valid && this.replay.accept(service, nonce, timestamp + 60);
    if (!fresh) throw new UnauthorizedException("service authentication failed");
    return true;
  }

  private header(request: RequestShape, name: string): string {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  }
}
