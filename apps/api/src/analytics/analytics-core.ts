import { createHash } from "node:crypto";

export const ANALYTICS_ROLES = ["platform_admin", "platform_observer", "marketing_manager"] as const;
export type AnalyticsRole = (typeof ANALYTICS_ROLES)[number];

export function requireAnalyticsRole(role: unknown, mutate = false): AnalyticsRole {
  const value = String(role ?? "") as AnalyticsRole;
  if (!ANALYTICS_ROLES.includes(value)) throw new Error("analytics_role_required");
  if (mutate && value === "platform_observer") throw new Error("analytics_write_forbidden");
  return value;
}

function cleanProperties(value: unknown, depth = 0): unknown {
  if (depth > 4) throw new Error("analytics_property_depth_invalid");
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value)) {
    if (value.length > 50) throw new Error("analytics_property_array_invalid");
    return value.map((item) => cleanProperties(item, depth + 1));
  }
  if (!value || typeof value !== "object") throw new Error("analytics_property_invalid");
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 50) throw new Error("analytics_property_count_invalid");
  return Object.fromEntries(entries.map(([key, item]) => {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) throw new Error("analytics_property_key_invalid");
    if (/phone|email|name|address|national|token|password|secret|message|description/i.test(key)) throw new Error("analytics_pii_forbidden");
    return [key, cleanProperties(item, depth + 1)];
  }));
}

export function normalizeEvent(input: Record<string, unknown>, now = new Date()) {
  const name = String(input.name ?? "").trim().toLowerCase();
  const version = Number(input.version ?? 1);
  const idempotencyKey = String(input.idempotencyKey ?? "").trim();
  const occurredAt = new Date(String(input.occurredAt ?? ""));
  const consent = String(input.consent ?? "none");
  if (!/^[a-z][a-z0-9_]{2,79}$/.test(name)) throw new Error("analytics_event_name_invalid");
  if (!Number.isInteger(version) || version < 1 || version > 100) throw new Error("analytics_event_version_invalid");
  if (!/^[A-Za-z0-9:_-]{12,160}$/.test(idempotencyKey)) throw new Error("analytics_idempotency_invalid");
  if (Number.isNaN(occurredAt.getTime()) || occurredAt > new Date(now.getTime() + 5 * 60_000) || occurredAt < new Date(now.getTime() - 7 * 86_400_000)) throw new Error("analytics_event_time_invalid");
  if (!["none", "functional", "analytics"].includes(consent)) throw new Error("analytics_consent_invalid");
  if (consent !== "analytics" && !name.startsWith("system_")) throw new Error("analytics_consent_required");
  return { name, version, idempotencyKey, occurredAt, consent, properties: cleanProperties(input.properties ?? {}) as Record<string, unknown> };
}

export function funnelSnapshot(steps: readonly { key: string; count: number }[]) {
  if (steps.length < 2 || steps.length > 12) throw new Error("analytics_funnel_steps_invalid");
  let previous = Number.POSITIVE_INFINITY;
  return steps.map((step, index) => {
    if (!/^[a-z][a-z0-9_]{1,63}$/.test(step.key) || !Number.isInteger(step.count) || step.count < 0 || step.count > previous) throw new Error("analytics_funnel_count_invalid");
    previous = step.count;
    const first = steps[0]?.count ?? 0;
    return { ...step, conversionBps: first ? Math.round(step.count * 10_000 / first) : 0, dropoff: index ? steps[index - 1].count - step.count : 0 };
  });
}

export function assignVariant(input: { experimentKey: string; subjectKey: string; variants: readonly { key: string; weight: number }[] }) {
  if (!/^[a-z][a-z0-9_.-]{2,79}$/.test(input.experimentKey) || !/^[A-Za-z0-9:_-]{8,160}$/.test(input.subjectKey)) throw new Error("analytics_assignment_key_invalid");
  const total = input.variants.reduce((sum, item) => sum + item.weight, 0);
  if (input.variants.length < 2 || input.variants.length > 8 || total !== 10_000 || input.variants.some((item) => !/^[a-z][a-z0-9_-]{0,39}$/.test(item.key) || !Number.isInteger(item.weight) || item.weight <= 0)) throw new Error("analytics_variant_invalid");
  const bucket = createHash("sha256").update(`${input.experimentKey}:${input.subjectKey}`).digest().readUInt32BE(0) % 10_000;
  let boundary = 0;
  return input.variants.find((item) => (boundary += item.weight) > bucket)!.key;
}

export function experimentDecision(input: { controlRateBps: number; variantRateBps: number; sampleSize: number; minimumSample: number; guardrailBreached: boolean }) {
  for (const value of [input.controlRateBps, input.variantRateBps]) if (!Number.isInteger(value) || value < 0 || value > 10_000) throw new Error("analytics_rate_invalid");
  if (!Number.isInteger(input.sampleSize) || !Number.isInteger(input.minimumSample) || input.minimumSample < 100) throw new Error("analytics_sample_invalid");
  if (input.guardrailBreached) return { state: "stop", reason: "guardrail_breached", liftBps: input.variantRateBps - input.controlRateBps };
  if (input.sampleSize < input.minimumSample) return { state: "collecting", reason: "minimum_sample", liftBps: input.variantRateBps - input.controlRateBps };
  const liftBps = input.variantRateBps - input.controlRateBps;
  return { state: Math.abs(liftBps) < 25 ? "inconclusive" : liftBps > 0 ? "candidate" : "stop", reason: liftBps > 0 ? "positive_lift" : "negative_or_flat", liftBps };
}
