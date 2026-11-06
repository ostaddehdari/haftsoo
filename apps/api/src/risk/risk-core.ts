import { createHash } from "node:crypto";

export const RISK_ROLES = ["risk_analyst", "risk_lead", "platform_admin"] as const;
export type RiskRole = (typeof RISK_ROLES)[number];
export type RiskAction = "allow" | "review" | "challenge" | "block";

export interface RiskSignal {
  code: string;
  score: number;
  source: "rule" | "velocity" | "device" | "graph" | "model" | "watchlist";
  explanation: string;
  evidenceHash: string;
}

export function requireRiskRole(role: unknown, mutate = false): RiskRole {
  const value = String(role ?? "") as RiskRole;
  if (!RISK_ROLES.includes(value)) throw new Error("risk_role_required");
  if (mutate && value === "risk_analyst") throw new Error("risk_lead_required");
  return value;
}

export function evidenceHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function normalizeSignals(input: readonly Omit<RiskSignal, "evidenceHash">[]) {
  if (!input.length || input.length > 40) throw new Error("risk_signal_count_invalid");
  const unique = new Map<string, RiskSignal>();
  for (const signal of input) {
    const code = String(signal.code).trim().toLowerCase();
    const explanation = String(signal.explanation).trim();
    if (!/^[a-z][a-z0-9_.-]{2,79}$/.test(code)) throw new Error("risk_signal_code_invalid");
    if (!Number.isInteger(signal.score) || signal.score < 0 || signal.score > 1000) throw new Error("risk_signal_score_invalid");
    if (!explanation || explanation.length > 240 || /\b(?:09\d{9}|\S+@\S+|\d{10})\b/.test(explanation)) throw new Error("risk_signal_explanation_invalid");
    if (unique.has(code)) throw new Error("risk_signal_duplicate");
    unique.set(code, { ...signal, code, explanation, evidenceHash: evidenceHash({ code, score: signal.score, source: signal.source }) });
  }
  return [...unique.values()].sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
}

export function velocitySignals(input: { attempts10m: number; accounts24h: number; listings1h: number; payments1h: number }) {
  for (const value of Object.values(input)) if (!Number.isInteger(value) || value < 0 || value > 100_000) throw new Error("risk_velocity_invalid");
  const signals: Omit<RiskSignal, "evidenceHash">[] = [];
  if (input.attempts10m >= 10) signals.push({ code: "velocity.auth_attempts", score: Math.min(900, 350 + input.attempts10m * 20), source: "velocity", explanation: "تعداد تلاش ورود در ده دقیقه بیش از حد مجاز است" });
  if (input.accounts24h >= 4) signals.push({ code: "velocity.shared_device_accounts", score: Math.min(950, 400 + input.accounts24h * 55), source: "device", explanation: "تعداد حساب‌های متصل به دستگاه در شبانه‌روز غیرعادی است" });
  if (input.listings1h >= 8) signals.push({ code: "velocity.listing_burst", score: Math.min(850, 300 + input.listings1h * 30), source: "velocity", explanation: "ثبت آگهی در یک ساعت الگوی جهشی دارد" });
  if (input.payments1h >= 6) signals.push({ code: "velocity.payment_burst", score: Math.min(1000, 500 + input.payments1h * 50), source: "velocity", explanation: "تعداد پرداخت در یک ساعت از خط مبنا عبور کرده است" });
  return signals.length ? normalizeSignals(signals) : [];
}

export function graphRisk(input: { nodes: number; sharedDevices: number; sharedPayments: number; blockedNeighbors: number }) {
  for (const value of Object.values(input)) if (!Number.isInteger(value) || value < 0 || value > 10_000) throw new Error("risk_graph_invalid");
  const raw = input.sharedDevices * 90 + input.sharedPayments * 140 + input.blockedNeighbors * 220 + Math.max(0, input.nodes - 10) * 12;
  return Math.min(1000, raw);
}

export function trustScore(input: { accountAgeDays: number; verifiedIdentity: boolean; successfulTrades: number; upheldReports: number; riskScore: number }) {
  if (!Number.isInteger(input.accountAgeDays) || input.accountAgeDays < 0 || !Number.isInteger(input.successfulTrades) || input.successfulTrades < 0 || !Number.isInteger(input.upheldReports) || input.upheldReports < 0 || !Number.isInteger(input.riskScore) || input.riskScore < 0 || input.riskScore > 1000) throw new Error("trust_input_invalid");
  const positive = Math.min(120, Math.floor(input.accountAgeDays / 30) * 4) + (input.verifiedIdentity ? 120 : 0) + Math.min(140, input.successfulTrades * 7);
  const negative = Math.min(350, input.upheldReports * 70) + Math.round(input.riskScore * 0.35);
  const score = Math.max(0, Math.min(1000, 500 + positive - negative));
  const band = score >= 800 ? "trusted" : score >= 600 ? "established" : score >= 400 ? "standard" : "restricted";
  return { score, band, positive, negative } as const;
}

export function riskDecision(input: { signals: readonly RiskSignal[]; graphScore: number; previousBlocks: number }) {
  if (!Number.isInteger(input.graphScore) || input.graphScore < 0 || input.graphScore > 1000 || !Number.isInteger(input.previousBlocks) || input.previousBlocks < 0) throw new Error("risk_decision_input_invalid");
  const strongest = input.signals[0]?.score ?? 0;
  const weighted = Math.min(1000, Math.round(strongest * 0.55 + input.graphScore * 0.3 + Math.min(1000, input.previousBlocks * 200) * 0.15));
  const action: RiskAction = weighted >= 850 ? "block" : weighted >= 650 ? "challenge" : weighted >= 350 ? "review" : "allow";
  return { riskScore: weighted, action, reasons: input.signals.slice(0, 5).map((signal) => signal.code) };
}

export function approveRiskDecision(input: { action: RiskAction; actorId: string; approverId?: string; reason: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(input.actorId) || input.reason.trim().length < 8 || input.reason.length > 500) throw new Error("risk_decision_invalid");
  if (input.action === "block" && (!input.approverId || input.approverId === input.actorId || !/^[0-9a-f-]{36}$/i.test(input.approverId))) throw new Error("risk_four_eyes_required");
  return { ...input, reason: input.reason.trim(), approved: input.action !== "block" || Boolean(input.approverId) };
}

export function leaseExpiry(now: Date, minutes = 15) {
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 60) throw new Error("risk_lease_invalid");
  return new Date(now.getTime() + minutes * 60_000);
}
