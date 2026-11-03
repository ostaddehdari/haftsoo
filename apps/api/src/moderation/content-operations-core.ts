import { createHash } from "node:crypto";

export const REPORT_REASONS = ["scam", "prohibited", "duplicate", "harassment", "wrong_category", "sold", "misleading", "other"] as const;
export type ReportReason = typeof REPORT_REASONS[number];
export type RiskBand = "critical" | "high" | "normal" | "low";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TARGET_MINUTES: Record<RiskBand, number> = { critical: 15, high: 60, normal: 240, low: 1440 };

export function validateUserReport(raw: Record<string, unknown>) {
  const postId = String(raw.postId ?? ""), reason = String(raw.reason ?? "") as ReportReason, description = String(raw.description ?? "").trim();
  if (!UUID.test(postId) || !REPORT_REASONS.includes(reason)) throw new Error("report_payload_invalid");
  if (description.length > 1000 || reason === "other" && description.length < 10) throw new Error("report_description_invalid");
  return { postId, reason, description };
}

export function riskBandForReport(reason: ReportReason, reportCount = 1): RiskBand {
  if (reason === "prohibited" || reason === "scam" && reportCount >= 3) return "critical";
  if (["scam", "harassment", "misleading"].includes(reason) || reportCount >= 5) return "high";
  if (["duplicate", "wrong_category"].includes(reason)) return "normal";
  return "low";
}

export function reportFingerprint(input: { tenantId: string; reporterId: string; postId: string; reason: ReportReason; now?: Date }) {
  const day = (input.now ?? new Date()).toISOString().slice(0, 10);
  return createHash("sha256").update(`${input.tenantId}|${input.reporterId}|${input.postId}|${input.reason}|${day}`).digest("hex");
}

export function slaDeadline(risk: RiskBand, createdAt = new Date()) { return new Date(createdAt.getTime() + TARGET_MINUTES[risk] * 60_000); }
export function slaStatus(dueAt: Date, now = new Date()) { const remainingMs = dueAt.getTime() - now.getTime(); return { state: remainingMs <= 0 ? "breached" : remainingMs <= 15 * 60_000 ? "at_risk" : "healthy", remainingSeconds: Math.max(0, Math.ceil(remainingMs / 1000)) } as const; }

export function validateClaim(raw: Record<string, unknown>) { const leaseMinutes = Number(raw.leaseMinutes ?? 15); if (!Number.isInteger(leaseMinutes) || leaseMinutes < 5 || leaseMinutes > 30) throw new Error("claim_lease_invalid"); return { leaseMinutes }; }
export function validateEscalation(raw: Record<string, unknown>) { const reason = String(raw.reason ?? "").trim(), note = String(raw.note ?? "").trim(); if (reason.length < 3 || reason.length > 80 || note.length > 1000) throw new Error("escalation_invalid"); return { reason, note }; }
export function maskSensitiveText(value: string) { return String(value ?? "").replace(/(?:\+?98|0)?9\d{9}/g, "09•••••••••").replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "•••@•••"); }
export function requiresSecondReview(risk: RiskBand, decision: string) { return risk === "critical" && ["approve", "reject"].includes(decision); }

