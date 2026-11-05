import { createHash } from "node:crypto";

export const ADMIN_ROLES = ["platform_admin", "platform_observer", "security_admin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
export type AdminMutationRole = Exclude<AdminRole, "platform_observer">;
export type PlatformState = "operational" | "degraded" | "incident";

export interface ServiceHeartbeat {
  service: string;
  status: "ok" | "degraded" | "down";
  latencyMs: number;
  checkedAt: string;
}

export function requireAdminRole(role: unknown, mutate = false): AdminRole {
  const value = String(role ?? "");
  if (!ADMIN_ROLES.includes(value as AdminRole)) throw new Error("admin_role_required");
  if (mutate && value === "platform_observer") throw new Error("admin_write_forbidden");
  return value as AdminRole;
}

export function platformState(services: readonly ServiceHeartbeat[]): PlatformState {
  if (!services.length || services.some((item) => item.status === "down")) return "incident";
  if (services.some((item) => item.status === "degraded" || item.latencyMs > 1_000)) return "degraded";
  return "operational";
}

export function executiveKpis(input: { users: number; activeListings: number; contacts: number; views: number; revenueIrr: number; openCases: number }) {
  for (const value of Object.values(input)) if (!Number.isFinite(value) || value < 0) throw new Error("admin_metric_invalid");
  return {
    ...input,
    contactRateBps: input.views ? Math.min(10_000, Math.round((input.contacts * 10_000) / input.views)) : 0,
    revenuePerListingIrr: input.activeListings ? Math.round(input.revenueIrr / input.activeListings) : 0
  };
}

function containsSecret(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSecret);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, item]) => /secret|password|private.?key|access.?token/i.test(key) || containsSecret(item));
}

export function validateConfiguration(input: { key: unknown; environment: unknown; value: unknown; reason: unknown }) {
  const key = String(input.key ?? "").trim().toLowerCase();
  const environment = String(input.environment ?? "").trim().toLowerCase();
  const reason = String(input.reason ?? "").trim().replace(/\s+/g, " ");
  if (!/^[a-z][a-z0-9_.-]{2,79}$/.test(key)) throw new Error("admin_config_key_invalid");
  if (!['development', 'staging', 'production'].includes(environment)) throw new Error("admin_config_environment_invalid");
  if (!input.value || typeof input.value !== "object" || Array.isArray(input.value)) throw new Error("admin_config_value_invalid");
  if (containsSecret(input.value)) throw new Error("admin_config_secret_forbidden");
  if (reason.length < 10 || reason.length > 500) throw new Error("admin_config_reason_invalid");
  const value = input.value as Record<string, unknown>;
  const checksum = createHash("sha256").update(JSON.stringify(value, Object.keys(value).sort())).digest("hex");
  return { key, environment, value, reason, checksum };
}

export function assertFourEyes(proposedBy: unknown, approvedBy: unknown) {
  const proposer = String(proposedBy ?? "");
  const approver = String(approvedBy ?? "");
  if (!proposer || !approver || proposer === approver) throw new Error("admin_four_eyes_required");
  return true;
}

const REPORTS = {
  marketplace: ["date", "new_users", "active_listings", "views", "contacts"],
  trust: ["date", "reports", "moderation_cases", "fraud_blocks", "appeals"],
  finance: ["date", "captured_irr", "refunded_irr", "settled_irr", "exceptions"],
  operations: ["date", "service", "availability_bps", "p95_ms", "incidents"]
} as const;

export function reportSpec(input: { kind: unknown; format: unknown; from: unknown; to: unknown }) {
  const kind = String(input.kind ?? "") as keyof typeof REPORTS;
  const format = String(input.format ?? "");
  const from = new Date(String(input.from ?? ""));
  const to = new Date(String(input.to ?? ""));
  if (!(kind in REPORTS)) throw new Error("admin_report_kind_invalid");
  if (!['csv', 'json'].includes(format)) throw new Error("admin_report_format_invalid");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to || to.getTime() - from.getTime() > 92 * 86_400_000) throw new Error("admin_report_range_invalid");
  return { kind, format: format as "csv" | "json", from, to, columns: [...REPORTS[kind]] };
}

export function sanitizeAuditMetadata(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) =>
      /phone|email|token|secret|password/i.test(key) ? [key, "[redacted]"] : [key, item],
    ),
  );
}
