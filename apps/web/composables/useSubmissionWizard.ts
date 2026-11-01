import type { Ref } from "vue";

export const submissionSteps = [
  { key: "category", title: "دسته‌بندی" }, { key: "details", title: "مشخصات" }, { key: "location", title: "موقعیت" },
  { key: "media", title: "رسانه و توضیحات" }, { key: "contact", title: "تماس و حریم خصوصی" }, { key: "preview", title: "پیش‌نمایش" }
] as const;
export type SubmissionStepKey = (typeof submissionSteps)[number]["key"];
export type SubmissionPayload = {
  category?: { key: string; slug: string; title: string; path: string[] };
  fields: Record<string, string | number | boolean | string[]>;
  location: { provinceKey?: string; cityKey?: string; neighborhoodKeys: string[] };
  media: Array<{ clientId: string; kind: "image" | "video"; name: string; size: number; contentType: string; status: "staged" }>;
  description: string;
  contact: { phone: string; chatEnabled: boolean; phoneVisible: boolean };
  privacy: { preciseLocationVisible: boolean };
  consents: { terms: boolean; safeTrade: boolean };
};

const initialPayload = (): SubmissionPayload => ({
  fields: {}, location: { neighborhoodKeys: [] }, media: [], description: "",
  contact: { phone: "", chatEnabled: true, phoneVisible: false }, privacy: { preciseLocationVisible: false },
  consents: { terms: false, safeTrade: true }
});

export function useSubmissionWizard() {
  const config = useRuntimeConfig();
  const step: Ref<SubmissionStepKey> = ref("category");
  const payload = reactive<SubmissionPayload>(initialPayload());
  const draftId = ref(""); const revision = ref(0); const saveState = ref<"saved" | "saving" | "offline" | "error">("saved");
  const errors = ref<Record<string, string>>({}); const submittedPostId = ref("");
  const tenantId = "00000000-0000-4000-8000-000000000001";
  const actorId = "00000000-0000-4000-8000-000000000002";
  let timer: ReturnType<typeof setTimeout> | undefined;

  const currentIndex = computed(() => submissionSteps.findIndex((item) => item.key === step.value));
  const storageKey = computed(() => `haftsoo-submission:${draftId.value || "local"}`);
  const headers = () => ({ "x-tenant-id": tenantId, "x-actor-id": actorId });
  function snapshot() { return JSON.parse(JSON.stringify(payload)) as SubmissionPayload; }
  function persistLocal() { if (import.meta.client) localStorage.setItem(storageKey.value, JSON.stringify({ step: step.value, payload: snapshot(), revision: revision.value, draftId: draftId.value })); }

  async function ensureDraft() {
    if (draftId.value) return;
    try {
      const response = await $fetch<{ data: { id: string; revision: number } }>(`${config.public.apiBase}/submissions/drafts`, { method: "POST", headers: headers() });
      draftId.value = response.data.id; revision.value = response.data.revision;
    } catch { draftId.value = crypto.randomUUID(); saveState.value = "offline"; }
  }
  async function save() {
    saveState.value = "saving"; await ensureDraft(); persistLocal();
    try {
      const response = await $fetch<{ data: { revision: number } }>(`${config.public.apiBase}/submissions/drafts/${draftId.value}`, { method: "PATCH", headers: headers(), body: { revision: revision.value, currentStep: step.value, payload: snapshot() } });
      revision.value = response.data.revision; saveState.value = "saved"; persistLocal();
    } catch { saveState.value = "offline"; }
  }
  function scheduleSave() { clearTimeout(timer); timer = setTimeout(save, 700); }
  function validate(target = step.value) {
    const next: Record<string, string> = {};
    if (target === "category" && !payload.category) next.category = "دسته‌بندی را انتخاب کنید.";
    if (target === "details" && String(payload.fields.title ?? "").trim().length < 3) next.title = "عنوان باید دست‌کم ۳ نویسه باشد.";
    if (target === "location" && (!payload.location.cityKey || payload.location.neighborhoodKeys.length === 0)) next.location = "شهر و حداقل یک محله را انتخاب کنید.";
    if (target === "media" && payload.description.trim().length < 10) next.description = "توضیحات باید دست‌کم ۱۰ نویسه باشد.";
    if (target === "contact" && !/^09\d{9}$/.test(payload.contact.phone)) next.phone = "شماره موبایل معتبر وارد کنید.";
    if (target === "contact" && !payload.consents.terms) next.terms = "پذیرش قوانین انتشار الزامی است.";
    errors.value = next; return Object.keys(next).length === 0;
  }
  async function next() { if (!validate()) return; const target = submissionSteps[currentIndex.value + 1]; if (target) { step.value = target.key; await save(); } }
  async function previous() { const target = submissionSteps[currentIndex.value - 1]; if (target) { step.value = target.key; await save(); } }
  async function goTo(target: SubmissionStepKey) { const index = submissionSteps.findIndex((item) => item.key === target); if (index <= currentIndex.value + 1) { step.value = target; await save(); } }
  async function submit() {
    for (const item of submissionSteps.slice(0, -1)) if (!validate(item.key)) { step.value = item.key; return; }
    await save(); const keyName = `haftsoo-idempotency:${draftId.value}`;
    const key = import.meta.client ? (localStorage.getItem(keyName) || `draft:${crypto.randomUUID()}`) : `draft:${crypto.randomUUID()}`;
    if (import.meta.client) localStorage.setItem(keyName, key);
    try {
      const response = await $fetch<{ data: { postId: string } }>(`${config.public.apiBase}/submissions/drafts/${draftId.value}/submit`, { method: "POST", headers: { ...headers(), "idempotency-key": key } });
      submittedPostId.value = response.data.postId;
    } catch { submittedPostId.value = `pending-${draftId.value.slice(0, 8)}`; }
  }
  function restore() {
    if (!import.meta.client) return; const candidate = Object.keys(localStorage).find((key) => key.startsWith("haftsoo-submission:"));
    if (!candidate) return; try { const saved = JSON.parse(localStorage.getItem(candidate) ?? "{}"); Object.assign(payload, initialPayload(), saved.payload); step.value = saved.step ?? "category"; revision.value = saved.revision ?? 0; draftId.value = saved.draftId ?? ""; } catch { localStorage.removeItem(candidate); }
  }
  watch(payload, scheduleSave, { deep: true }); onMounted(restore); onBeforeUnmount(() => clearTimeout(timer));
  return { step, payload, draftId, revision, saveState, errors, submittedPostId, currentIndex, next, previous, goTo, save, submit };
}
