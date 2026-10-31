import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type PrincipalType = "anonymous" | "user" | "business" | "workforce" | "service";
export type Role = "guest" | "member" | "business_owner" | "moderator" | "support_agent" | "finance_operator" | "platform_admin" | "service";

export interface Principal {
  id: string;
  type: PrincipalType;
  roles: Role[];
  tenantId: string;
  scopes: string[];
}

const permissionsByRole: Readonly<Record<Role, readonly string[]>> = {
  guest: ["listing:read"],
  member: ["listing:read", "listing:create", "profile:self:read", "profile:self:update", "chat:self:use"],
  business_owner: ["listing:read", "listing:create", "listing:business:manage", "profile:self:read", "profile:self:update"],
  moderator: ["listing:read", "moderation:queue:read", "moderation:decision:create"],
  support_agent: ["listing:read", "support:case:read", "support:case:update", "profile:masked:read"],
  finance_operator: ["finance:ledger:read", "finance:reconciliation:execute"],
  platform_admin: ["platform:configuration:manage", "audit:read", "iam:assignment:manage"],
  service: ["service:internal:invoke"]
};

export function authorize(principal: Principal, permission: string, requiredScope?: string): boolean {
  if (requiredScope && !principal.scopes.includes(requiredScope)) return false;
  return principal.roles.some((role) => permissionsByRole[role].includes(permission));
}

export interface DeviceSignals {
  knownDevice: boolean;
  attested: boolean;
  recentFailures: number;
  ipVelocityKph: number;
}

export function evaluateDeviceTrust(signals: DeviceSignals): { score: number; action: "allow" | "step-up" | "deny" } {
  let risk = 0;
  if (!signals.knownDevice) risk += 25;
  if (!signals.attested) risk += 20;
  risk += Math.min(Math.max(signals.recentFailures, 0) * 10, 30);
  if (signals.ipVelocityKph > 900) risk += 35;
  else if (signals.ipVelocityKph > 300) risk += 15;
  const score = Math.min(risk, 100);
  return { score, action: score >= 70 ? "deny" : score >= 35 ? "step-up" : "allow" };
}

export interface ServiceSignatureInput {
  service: string;
  method: string;
  path: string;
  timestamp: number;
  nonce: string;
}

function canonicalServiceRequest(input: ServiceSignatureInput): string {
  return [input.service, input.method.toUpperCase(), input.path, String(input.timestamp), input.nonce].join("\n");
}

export function createServiceSignature(input: ServiceSignatureInput, key: string): string {
  return createHmac("sha256", key).update(canonicalServiceRequest(input)).digest("hex");
}

export function verifyServiceSignature(
  input: ServiceSignatureInput,
  signature: string,
  key: string,
  allowedServices: ReadonlySet<string>,
  nowSeconds = Math.floor(Date.now() / 1000),
  maximumSkewSeconds = 60
): boolean {
  if (!allowedServices.has(input.service)) return false;
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(input.service)) return false;
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(input.nonce)) return false;
  if (Math.abs(nowSeconds - input.timestamp) > maximumSkewSeconds) return false;
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = Buffer.from(createServiceSignature(input, key), "hex");
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export class NonceReplayGuard {
  private readonly seen = new Map<string, number>();

  accept(service: string, nonce: string, expiresAtSeconds: number, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
    for (const [key, expiry] of this.seen) if (expiry < nowSeconds) this.seen.delete(key);
    const key = `${service}:${nonce}`;
    if (this.seen.has(key)) return false;
    this.seen.set(key, expiresAtSeconds);
    return true;
  }
}

export class SlidingWindowRateLimiter {
  private readonly events = new Map<string, number[]>();

  constructor(private readonly limit: number, private readonly windowMilliseconds: number) {}

  consume(key: string, nowMilliseconds = Date.now()): { allowed: boolean; remaining: number; retryAfterMilliseconds: number } {
    const cutoff = nowMilliseconds - this.windowMilliseconds;
    const current = (this.events.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
    if (current.length >= this.limit) {
      const retryAfterMilliseconds = Math.max(current[0] + this.windowMilliseconds - nowMilliseconds, 1);
      this.events.set(key, current);
      return { allowed: false, remaining: 0, retryAfterMilliseconds };
    }
    current.push(nowMilliseconds);
    this.events.set(key, current);
    return { allowed: true, remaining: this.limit - current.length, retryAfterMilliseconds: 0 };
  }
}

export interface AuditEvent {
  id: string;
  occurredAt: string;
  actorId: string;
  actorType: PrincipalType;
  action: string;
  resource: string;
  requestId: string;
  outcome: "success" | "denied" | "failure";
}

export interface AuditRecord {
  sequence: number;
  previousHash: string;
  event: AuditEvent;
  hash: string;
  signature: string;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function appendAuditEvent(previous: AuditRecord | undefined, event: AuditEvent, signingKey: string): AuditRecord {
  const sequence = (previous?.sequence ?? 0) + 1;
  const previousHash = previous?.hash ?? "0".repeat(64);
  const payload = stable({ sequence, previousHash, event });
  const hash = createHash("sha256").update(payload).digest("hex");
  const signature = createHmac("sha256", signingKey).update(hash).digest("hex");
  return { sequence, previousHash, event, hash, signature };
}

export function verifyAuditChain(records: readonly AuditRecord[], signingKey: string): boolean {
  let previous: AuditRecord | undefined;
  for (const record of records) {
    const expected = appendAuditEvent(previous, record.event, signingKey);
    if (record.sequence !== expected.sequence || record.previousHash !== expected.previousHash) return false;
    if (record.hash !== expected.hash || record.signature !== expected.signature) return false;
    previous = record;
  }
  return true;
}
