export const POST_STATUSES = ["pending_review", "needs_changes", "published", "paused", "rejected", "expired", "archived", "deleted"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
export type LifecycleActor = "owner" | "moderator" | "system";
export type OwnerPostAction = "pause" | "resume" | "renew" | "republish" | "archive" | "delete";
export type MyPostsBucket = "active" | "drafts" | "review" | "rejected" | "expired" | "archived";

const transitions: Record<LifecycleActor, Partial<Record<PostStatus, readonly PostStatus[]>>> = {
  owner: {
    published: ["paused", "archived", "deleted"],
    paused: ["published", "archived", "deleted"],
    needs_changes: ["pending_review", "archived", "deleted"],
    rejected: ["pending_review", "archived", "deleted"],
    expired: ["pending_review", "archived", "deleted"],
    pending_review: ["archived", "deleted"]
  },
  moderator: {
    pending_review: ["published", "needs_changes", "rejected"],
    needs_changes: ["published", "rejected"],
    published: ["needs_changes", "rejected", "archived"]
  },
  system: {
    published: ["expired"],
    paused: ["expired"],
    archived: ["deleted"]
  }
};

export const BUCKET_STATUSES: Record<Exclude<MyPostsBucket, "drafts">, readonly PostStatus[]> = {
  active: ["published", "paused"],
  review: ["pending_review", "needs_changes"],
  rejected: ["rejected"],
  expired: ["expired"],
  archived: ["archived", "deleted"]
};

export function canPostTransition(from: PostStatus, to: PostStatus, actor: LifecycleActor): boolean {
  return transitions[actor][from]?.includes(to) ?? false;
}

export function assertPostTransition(from: PostStatus, to: PostStatus, actor: LifecycleActor): void {
  if (!POST_STATUSES.includes(from) || !POST_STATUSES.includes(to) || !canPostTransition(from, to, actor)) throw new Error(`invalid_post_transition:${actor}:${from}:${to}`);
}

export function targetForOwnerAction(status: PostStatus, action: OwnerPostAction): PostStatus {
  const targets: Record<OwnerPostAction, PostStatus> = {
    pause: "paused", resume: "published", renew: "published", republish: "pending_review", archive: "archived", delete: "deleted"
  };
  const target = targets[action];
  if (action === "renew" && status !== "published" && status !== "paused") throw new Error("renew_not_allowed");
  if (action === "republish" && !["expired", "rejected", "needs_changes"].includes(status)) throw new Error("republish_not_allowed");
  if (action !== "renew") assertPostTransition(status, target, "owner");
  return target;
}

export function expiryDate(from = new Date(), days = 30): Date {
  const result = new Date(from);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function moderationMessage(input: { status: PostStatus; reasonCode?: string | null; message?: string | null }) {
  const defaultMessages: Partial<Record<PostStatus, string>> = {
    pending_review: "آگهی شما در صف بررسی است.",
    needs_changes: "برای انتشار، آگهی به اصلاح نیاز دارد.",
    rejected: "آگهی مطابق ضوابط انتشار تأیید نشد.",
    published: "آگهی منتشر شد."
  };
  return { status: input.status, reasonCode: input.reasonCode ?? null, message: input.message?.trim() || defaultMessages[input.status] || null };
}

export function normalizePageSize(value: number | undefined): number {
  return Math.min(Math.max(Number.isInteger(value) ? Number(value) : 20, 1), 50);
}
