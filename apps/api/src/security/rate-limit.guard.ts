import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { SlidingWindowRateLimiter } from "./security-core";

@Injectable()
export class SecurityRateLimitGuard implements CanActivate {
  private readonly limiter = new SlidingWindowRateLimiter(30, 60_000);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ ip?: string; headers: Record<string, string | undefined> }>();
    const key = request.ip ?? request.headers["x-forwarded-for"]?.split(",", 1)[0]?.trim() ?? "unknown";
    const result = this.limiter.consume(key);
    if (!result.allowed) throw new HttpException("request limit exceeded", HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
}
