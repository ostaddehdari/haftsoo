import { createHash, randomUUID } from "node:crypto";

export const SUBMISSION_STEPS = ["category", "details", "location", "media", "contact", "preview"] as const;
export type SubmissionStep = (typeof SUBMISSION_STEPS)[number];
export type SubmissionStatus = "draft" | "ready" | "submitted";

export interface SubmissionMediaItem {
  clientId: string;
  kind: "image" | "video";
  name: string;
  size: number;
  contentType: string;
  status: "staged" | "uploaded";
}

export interface SubmissionDraftPayload {
  category?: { key: string; slug: string; path: string[] };
  fields?: Record<string, string | number | boolean | string[]>;
  location?: { provinceKey: string; cityKey: string; neighborhoodKeys: string[]; latitude?: number; longitude?: number };
  media?: SubmissionMediaItem[];
  description?: string;
  contact?: { phone: string; chatEnabled: boolean; phoneVisible: boolean };
  privacy?: { preciseLocationVisible: boolean };
  consents?: { terms: boolean; safeTrade: boolean };
}

export interface SubmissionDraft {
  id: string;
  status: SubmissionStatus;
  currentStep: SubmissionStep;
  revision: number;
  payload: SubmissionDraftPayload;
  updatedAt: string;
}

export interface ValidationIssue { path: string; code: string; message: string }

const stepIndex = (step: SubmissionStep) => SUBMISSION_STEPS.indexOf(step);

export function canTransition(from: SubmissionStep, to: SubmissionStep): boolean {
  return Math.abs(stepIndex(from) - stepIndex(to)) <= 1;
}

export function assertTransition(from: SubmissionStep, to: SubmissionStep): void {
  if (!SUBMISSION_STEPS.includes(to) || !canTransition(from, to)) throw new Error(`invalid submission transition: ${from} -> ${to}`);
}

export function validateSubmission(payload: SubmissionDraftPayload, through: SubmissionStep = "preview"): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const reached = (step: SubmissionStep) => stepIndex(through) >= stepIndex(step);
  if (reached("category") && (!payload.category?.key || !payload.category.slug)) issues.push({ path: "category", code: "required", message: "دسته‌بندی را انتخاب کنید." });
  if (reached("details")) {
    const title = payload.fields?.title;
    if (typeof title !== "string" || title.trim().length < 3) issues.push({ path: "fields.title", code: "min_length", message: "عنوان باید دست‌کم ۳ نویسه باشد." });
  }
  if (reached("location") && (!payload.location?.cityKey || payload.location.neighborhoodKeys.length === 0)) issues.push({ path: "location", code: "required", message: "شهر و حداقل یک محله را انتخاب کنید." });
  if (reached("media")) {
    if ((payload.media?.length ?? 0) > 10) issues.push({ path: "media", code: "max_items", message: "حداکثر ۱۰ رسانه مجاز است." });
    if ((payload.description?.trim().length ?? 0) < 10) issues.push({ path: "description", code: "min_length", message: "توضیحات باید دست‌کم ۱۰ نویسه باشد." });
  }
  if (reached("contact")) {
    if (!/^09\d{9}$/.test(payload.contact?.phone ?? "")) issues.push({ path: "contact.phone", code: "format", message: "شماره موبایل معتبر نیست." });
    if (!payload.consents?.terms) issues.push({ path: "consents.terms", code: "required", message: "پذیرش قوانین انتشار الزامی است." });
  }
  return issues;
}

export function stableSubmissionChecksum(payload: SubmissionDraftPayload): string {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)]));
    return value;
  };
  return createHash("sha256").update(JSON.stringify(normalize(payload))).digest("hex");
}

export function newSubmissionDraft(): SubmissionDraft {
  return { id: randomUUID(), status: "draft", currentStep: "category", revision: 0, payload: {}, updatedAt: new Date().toISOString() };
}

export function validIdempotencyKey(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(value);
}
