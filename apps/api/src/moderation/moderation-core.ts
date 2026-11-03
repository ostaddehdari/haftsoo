import { createHash } from "node:crypto";

export const MODERATION_REASONS = ["prohibited_goods", "fraud_pattern", "contact_bypass", "spam", "unsafe_image", "duplicate_exact", "duplicate_likely", "manual_report"] as const;
export type ModerationReason = typeof MODERATION_REASONS[number];
export type ModerationAction = "allow" | "review" | "reject";
export type ModerationSignal = { code: ModerationReason; score: number; source: "rule" | "text_model" | "vision_model" | "duplicate" | "report"; explanation: string };
export type DuplicateCandidate = { postId: string; ownerId: string; createdAt: string; categorySlug: string; cityKey: string; normalizedText: string; imageHashes: string[]; deviceHash?: string | null };
export type ModerationInput = { postId: string; ownerId: string; title: string; description: string; categorySlug: string; cityKey: string; imageHashes?: string[]; unsafeImageScore?: number; deviceHash?: string | null; now?: Date };

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹", ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PROHIBITED = [/(?:اسلحه|تفنگ|مهمات)/u, /(?:مواد\s*مخدر|شیشه|هروئین)/u, /(?:فروش\s*حساب\s*بانکی|مدرک\s*جعلی)/u];
const FRAUD = [/(?:سود|درآمد)\s*(?:قطعی|تضمینی)/u, /بدون\s*(?:ریسک|مدرک).*واریز/u, /(?:بیعانه|پیش.?پرداخت).*فوری/u];
const CONTACT = /(?:\+?۹۸|\+?98|0)?9[۰-۹0-9]{9}|(?:https?:\/\/|t\.me\/|wa\.me\/|@[a-z0-9_]{4,})/iu;

export function normalizePersianText(value: string) {
  return String(value ?? "").normalize("NFKC").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[ةۀ]/g, "ه").replace(/[\u200c\u200d\u200e\u200f\ufeff]/g, " ").replace(/[۰-۹]/g, digit => String(PERSIAN_DIGITS.indexOf(digit))).replace(/[٠-٩]/g, digit => String(ARABIC_DIGITS.indexOf(digit))).toLocaleLowerCase("fa-IR").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

export function moderationFingerprint(input: Pick<ModerationInput, "title" | "description" | "categorySlug" | "cityKey">) {
  const normalized = normalizePersianText(`${input.title} ${input.description}`), material = `${input.categorySlug}|${input.cityKey}|${normalized}`;
  return { normalized, hash: createHash("sha256").update(material).digest("hex") };
}

export function inspectText(title: string, description: string): ModerationSignal[] {
  const text = normalizePersianText(`${title} ${description}`), signals: ModerationSignal[] = [];
  if (PROHIBITED.some(pattern => pattern.test(text))) signals.push({ code: "prohibited_goods", score: 1, source: "rule", explanation: "کالای ممنوع یا عبارت صریحاً غیرمجاز شناسایی شد." });
  if (FRAUD.some(pattern => pattern.test(text))) signals.push({ code: "fraud_pattern", score: .78, source: "text_model", explanation: "الگوی وعده قطعی، بیعانه فوری یا عبارت پرریسک دیده شد." });
  if (CONTACT.test(`${title} ${description}`)) signals.push({ code: "contact_bypass", score: .62, source: "rule", explanation: "شماره یا پیوند تماس بیرون از فیلدهای امن آگهی قرار گرفته است." });
  if (/(.)\1{7,}/u.test(text) || new Set(text.split(" ")).size < Math.max(2, text.split(" ").length / 4)) signals.push({ code: "spam", score: .55, source: "rule", explanation: "تکرار غیرعادی حروف یا واژه‌ها مشاهده شد." });
  return signals;
}

function tokens(value: string) { return new Set(normalizePersianText(value).split(" ").filter(token => token.length > 1)); }
export function textSimilarity(left: string, right: string) { const a = tokens(left), b = tokens(right); if (!a.size && !b.size) return 1; let intersection = 0; for (const token of a) if (b.has(token)) intersection++; return intersection / Math.max(1, a.size + b.size - intersection); }
export function imageHashSimilarity(left: string, right: string) { if (!/^[a-f0-9]{16,}$/i.test(left) || left.length !== right.length) return 0; let distance = 0; for (let index = 0; index < left.length; index++) { const delta = parseInt(left[index]!, 16) ^ parseInt(right[index]!, 16); distance += delta.toString(2).replace(/0/g, "").length; } return Math.max(0, 1 - distance / (left.length * 4)); }
export function duplicateScore(input: ModerationInput, candidate: DuplicateCandidate) {
  const text = textSimilarity(`${input.title} ${input.description}`, candidate.normalizedText), image = Math.max(0, ...(input.imageHashes ?? []).flatMap(hash => candidate.imageHashes.map(other => imageHashSimilarity(hash, other)))), context = (input.categorySlug === candidate.categorySlug ? .08 : 0) + (input.cityKey === candidate.cityKey ? .04 : 0), actor = input.ownerId === candidate.ownerId ? .12 : 0, device = input.deviceHash && input.deviceHash === candidate.deviceHash ? .08 : 0;
  return Math.min(1, text * .5 + image * .3 + context + actor + device);
}

export function evaluateModeration(input: ModerationInput, candidates: DuplicateCandidate[] = [], modelVersion = "haftsoo-moderation-v1") {
  const signals = inspectText(input.title, input.description), now = input.now ?? new Date();
  if (Number(input.unsafeImageScore ?? 0) >= .85) signals.push({ code: "unsafe_image", score: Number(input.unsafeImageScore), source: "vision_model", explanation: "امتیاز ایمنی تصویر از آستانه مجاز عبور کرده است." });
  let best: { candidate: DuplicateCandidate; score: number } | null = null;
  for (const candidate of candidates) { const age = now.getTime() - new Date(candidate.createdAt).getTime(); if (age < 0 || age > 86_400_000) continue; const score = duplicateScore(input, candidate); if (!best || score > best.score) best = { candidate, score }; }
  if (best && best.score >= .82) signals.push({ code: best.score >= .94 && best.candidate.ownerId === input.ownerId ? "duplicate_exact" : "duplicate_likely", score: best.score, source: "duplicate", explanation: `شباهت چندسیگناله با آگهی ${best.candidate.postId} در بازه ۲۴ ساعت.` });
  const critical = signals.some(signal => signal.code === "prohibited_goods" || signal.code === "unsafe_image" && signal.score >= .97 || signal.code === "duplicate_exact" && signal.score >= .96), riskScore = Math.min(1, signals.reduce((score, signal) => Math.max(score, signal.score), 0) + Math.max(0, signals.length - 1) * .04), action: ModerationAction = critical ? "reject" : riskScore >= .55 ? "review" : "allow";
  const fingerprint = moderationFingerprint(input);
  return { action, riskScore: Number(riskScore.toFixed(4)), reasonCodes: [...new Set(signals.map(signal => signal.code))], signals, fingerprint, duplicateOfPostId: best?.score && best.score >= .82 ? best.candidate.postId : null, modelVersion, explanation: signals.length ? signals.map(signal => signal.explanation).join(" ") : "سیگنال پرریسکی مشاهده نشد." };
}

export function validateHumanDecision(raw: Record<string, unknown>) { const decision = String(raw.decision ?? ""); if (!["approve", "needs_changes", "reject"].includes(decision)) throw new Error("moderation_decision_invalid"); const reasonCode = String(raw.reasonCode ?? "").trim(), note = String(raw.note ?? "").trim(); if (reasonCode.length < 3 || reasonCode.length > 80 || note.length > 1000) throw new Error("moderation_decision_detail_invalid"); return { decision: decision as "approve" | "needs_changes" | "reject", reasonCode, note }; }
export function validateAppeal(raw: Record<string, unknown>) { const statement = String(raw.statement ?? "").trim(); if (statement.length < 20 || statement.length > 2000) throw new Error("moderation_appeal_invalid"); return { statement }; }
