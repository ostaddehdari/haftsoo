import { createHash } from "node:crypto";

export const SRE_ROLES = ["sre_operator", "incident_commander", "platform_admin"] as const;
export type SreRole = (typeof SRE_ROLES)[number];
export type IncidentSeverity = "sev1" | "sev2" | "sev3" | "sev4";
export type IncidentState = "detected" | "triaged" | "mitigating" | "monitoring" | "resolved" | "closed";

const ATTRIBUTE_ALLOWLIST = new Set(["service.name", "deployment.environment", "http.request.method", "http.route", "http.response.status_code", "rpc.system", "rpc.method", "messaging.system", "error.type"]);

export function requireSreRole(role: unknown, command = false): SreRole {
  const value = String(role ?? "") as SreRole;
  if (!SRE_ROLES.includes(value)) throw new Error("sre_role_required");
  if (command && value === "sre_operator") throw new Error("incident_commander_required");
  return value;
}

export function sanitizeTelemetryAttributes(input: Record<string, unknown>) {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, raw] of Object.entries(input)) {
    if (!ATTRIBUTE_ALLOWLIST.has(key)) continue;
    const value = typeof raw === "string" ? raw.trim() : raw;
    if (typeof value === "string" && (value.length > 160 || /(?:09\d{9}|\S+@\S+|\b\d{10}\b)/.test(value))) throw new Error("telemetry_pii_forbidden");
    if (!["string", "number", "boolean"].includes(typeof value)) throw new Error("telemetry_attribute_invalid");
    result[key] = value as string | number | boolean;
  }
  return result;
}

export function normalizeTelemetryEnvelope(input: { traceId: string; spanId: string; service: string; route: string; attributes: Record<string, unknown> }) {
  if (!/^[a-f0-9]{32}$/.test(input.traceId) || !/^[a-f0-9]{16}$/.test(input.spanId)) throw new Error("telemetry_trace_context_invalid");
  const service = input.service.trim().toLowerCase(), route = input.route.trim();
  if (!/^[a-z][a-z0-9-]{2,62}$/.test(service) || !route.startsWith("/") || route.length > 120 || /\b\d{6,}\b/.test(route)) throw new Error("telemetry_resource_invalid");
  return { traceId: input.traceId, spanId: input.spanId, service, route, attributes: sanitizeTelemetryAttributes(input.attributes) };
}

export function evaluateSlo(input: { total: number; good: number; targetBps: number; windowMinutes: number }) {
  if (!Number.isInteger(input.total) || input.total < 0 || !Number.isInteger(input.good) || input.good < 0 || input.good > input.total || !Number.isInteger(input.targetBps) || input.targetBps < 5000 || input.targetBps > 9999 || !Number.isInteger(input.windowMinutes) || input.windowMinutes < 1) throw new Error("slo_input_invalid");
  const allowedBad = Math.max(1, Math.floor(input.total * (10_000 - input.targetBps) / 10_000));
  const bad = input.total - input.good, consumedBps = Math.min(100_000, Math.round(bad / allowedBad * 10_000));
  const status = consumedBps >= 10_000 ? "exhausted" : consumedBps >= 5_000 ? "at_risk" : "healthy";
  return { availabilityBps: input.total ? Math.round(input.good / input.total * 10_000) : 10_000, allowedBad, bad, consumedBps, remainingBps: Math.max(0, 10_000 - consumedBps), status } as const;
}

export function multiWindowBurnRate(input: { shortConsumedBps: number; longConsumedBps: number; shortWindowMinutes: number; longWindowMinutes: number }) {
  for (const value of [input.shortConsumedBps, input.longConsumedBps, input.shortWindowMinutes, input.longWindowMinutes]) if (!Number.isFinite(value) || value < 0) throw new Error("burn_rate_input_invalid");
  if (input.shortWindowMinutes >= input.longWindowMinutes) throw new Error("burn_rate_window_invalid");
  const shortRate = input.shortConsumedBps / 10_000, longRate = input.longConsumedBps / 10_000;
  const severity: IncidentSeverity | null = shortRate >= 14.4 && longRate >= 6 ? "sev1" : shortRate >= 6 && longRate >= 3 ? "sev2" : shortRate >= 2 && longRate >= 1 ? "sev3" : null;
  return { shortRate, longRate, severity, shouldPage: severity === "sev1" || severity === "sev2" };
}

export function alertFingerprint(input: { ruleKey: string; service: string; environment: string; region?: string }) {
  const normalized = [input.ruleKey, input.service, input.environment, input.region ?? "global"].map((value) => String(value).trim().toLowerCase());
  if (normalized.some((value) => !/^[a-z0-9_.-]{2,80}$/.test(value))) throw new Error("alert_label_invalid");
  return createHash("sha256").update(normalized.join("|")).digest("hex");
}

const TRANSITIONS: Record<IncidentState, IncidentState[]> = { detected: ["triaged"], triaged: ["mitigating", "resolved"], mitigating: ["monitoring", "resolved"], monitoring: ["mitigating", "resolved"], resolved: ["closed", "mitigating"], closed: [] };
export function transitionIncident(input: { current: IncidentState; next: IncidentState; severity: IncidentSeverity; actorRole: unknown; summary: string }) {
  requireSreRole(input.actorRole, input.severity === "sev1" || input.next === "closed");
  if (!TRANSITIONS[input.current].includes(input.next)) throw new Error("incident_transition_invalid");
  const summary = input.summary.replace(/\s+/g, " ").trim();
  if (summary.length < 12 || summary.length > 500) throw new Error("incident_summary_invalid");
  return { from: input.current, to: input.next, severity: input.severity, summary };
}

export function validatePostmortem(input: { severity: IncidentSeverity; impact: string; rootCause: string; contributingFactors: string[]; actionOwners: string[]; reviewerId?: string; commanderId: string }) {
  if (input.impact.trim().length < 20 || input.rootCause.trim().length < 20 || !input.contributingFactors.length || !input.actionOwners.length) throw new Error("postmortem_incomplete");
  if ((input.severity === "sev1" || input.severity === "sev2") && (!input.reviewerId || input.reviewerId === input.commanderId)) throw new Error("postmortem_independent_review_required");
  return { complete: true, independentReview: Boolean(input.reviewerId && input.reviewerId !== input.commanderId) };
}
