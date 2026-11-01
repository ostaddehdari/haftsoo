export type MyPostsBucket = "active" | "drafts" | "review" | "rejected" | "expired" | "archived";
export type MyPostStatus = "draft" | "pending_review" | "needs_changes" | "published" | "paused" | "rejected" | "expired" | "archived" | "deleted";

export interface MyPostItem {
  id: string;
  kind: "post" | "draft";
  title: string;
  status: MyPostStatus;
  version: number;
  updatedAt: string;
  expiresAt?: string;
  currentStep?: string;
  moderation?: { reasonCode?: string | null; message?: string | null };
}

const samples: Record<MyPostsBucket, MyPostItem[]> = {
  active: [
    { id: "hs-owner-1", kind: "post", title: "آپارتمان ۹۵ متری نورگیر، عباس‌آباد", status: "published", version: 3, updatedAt: "2026-10-31T09:30:00Z", expiresAt: "2026-11-29T09:30:00Z" },
    { id: "hs-owner-2", kind: "post", title: "پژو ۲۰۷ اتوماتیک کم‌کارکرد", status: "paused", version: 2, updatedAt: "2026-10-30T14:10:00Z" }
  ],
  drafts: [{ id: "hs-draft-1", kind: "draft", title: "مبل راحتی هفت‌نفره", status: "draft", version: 4, currentStep: "media", updatedAt: "2026-11-01T07:15:00Z" }],
  review: [{ id: "hs-owner-3", kind: "post", title: "گوشی پرچمدار با ضمانت", status: "needs_changes", version: 2, updatedAt: "2026-11-01T06:20:00Z", moderation: { reasonCode: "TITLE_DETAIL", message: "مدل دقیق کالا را در عنوان آگهی بنویسید." } }],
  rejected: [{ id: "hs-owner-4", kind: "post", title: "خدمات تعمیر در محل", status: "rejected", version: 1, updatedAt: "2026-10-29T11:00:00Z", moderation: { reasonCode: "DUPLICATE", message: "یک آگهی مشابه در همین روز ثبت شده است." } }],
  expired: [{ id: "hs-owner-5", kind: "post", title: "میز ناهارخوری چوبی", status: "expired", version: 5, updatedAt: "2026-10-27T08:00:00Z" }],
  archived: []
};

export const myPostBuckets: Array<{ key: MyPostsBucket; label: string }> = [
  { key: "active", label: "فعال" }, { key: "drafts", label: "پیش‌نویس" }, { key: "review", label: "در حال بررسی" },
  { key: "rejected", label: "ردشده" }, { key: "expired", label: "منقضی" }, { key: "archived", label: "بایگانی" }
];

export const statusLabels: Record<MyPostStatus, string> = {
  draft: "پیش‌نویس", pending_review: "در انتظار بررسی", needs_changes: "نیازمند اصلاح", published: "منتشرشده", paused: "متوقف‌شده",
  rejected: "ردشده", expired: "منقضی", archived: "بایگانی‌شده", deleted: "حذف‌شده"
};

export function useMyPosts() {
  const bucket = ref<MyPostsBucket>("active");
  const loading = ref(false);
  const error = ref("");
  const items = ref<MyPostItem[]>([...samples.active]);
  const historyFor = ref<string | null>(null);

  async function load(next: MyPostsBucket) {
    bucket.value = next; loading.value = true; error.value = "";
    try {
      const response = await $fetch<{ data: { items: MyPostItem[] } }>("/api/v1/my/posts", { query: { bucket: next } });
      items.value = response.data.items;
    } catch {
      items.value = [...samples[next]];
    } finally { loading.value = false; }
  }

  async function action(item: MyPostItem, operation: "pause" | "resume" | "renew" | "republish" | "archive" | "delete") {
    const before = [...items.value];
    if (["archive", "delete"].includes(operation)) items.value = items.value.filter((candidate: MyPostItem) => candidate.id !== item.id);
    else item.status = operation === "pause" ? "paused" : operation === "republish" ? "pending_review" : "published";
    try {
      await $fetch(`/api/v1/my/posts/${item.id}/actions`, { method: "POST", body: { expectedVersion: item.version, action: operation, requestId: crypto.randomUUID() } });
      await load(bucket.value);
    } catch { if (!item.id.startsWith("hs-")) { items.value = before; error.value = "انجام عملیات ممکن نشد؛ دوباره تلاش کنید."; } }
  }

  return { bucket, items, loading, error, historyFor, load, action };
}
