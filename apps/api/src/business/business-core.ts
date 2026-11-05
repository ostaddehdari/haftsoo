import { createHash, randomBytes } from "node:crypto";

export const BUSINESS_ROLES = ["owner", "admin", "listing_manager", "support", "analyst", "billing"] as const;
export type BusinessRole = (typeof BUSINESS_ROLES)[number];
export const BUSINESS_PERMISSIONS = ["business:read", "business:update", "member:invite", "member:manage", "branch:manage", "storefront:manage", "listing:manage", "lead:read", "analytics:read", "billing:manage"] as const;
export type BusinessPermission = (typeof BUSINESS_PERMISSIONS)[number];

const ROLE_PERMISSIONS: Readonly<Record<BusinessRole, readonly BusinessPermission[]>> = {
  owner: BUSINESS_PERMISSIONS,
  admin: ["business:read", "business:update", "member:invite", "member:manage", "branch:manage", "storefront:manage", "listing:manage", "lead:read", "analytics:read"],
  listing_manager: ["business:read", "branch:manage", "storefront:manage", "listing:manage", "lead:read", "analytics:read"],
  support: ["business:read", "lead:read"],
  analyst: ["business:read", "lead:read", "analytics:read"],
  billing: ["business:read", "billing:manage"]
};

export function normalizeBusiness(input: { slug: unknown; displayName: unknown; legalName?: unknown; nationalId?: unknown }) {
  const slug = String(input.slug ?? "").trim().toLowerCase();
  const displayName = String(input.displayName ?? "").trim().replace(/\s+/g, " ");
  const legalName = String(input.legalName ?? displayName).trim().replace(/\s+/g, " ");
  const nationalId = String(input.nationalId ?? "").replace(/\D/g, "");
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(slug) || displayName.length < 2 || displayName.length > 120 || legalName.length < 2 || legalName.length > 160 || (nationalId && !/^\d{10,12}$/.test(nationalId))) throw new Error("business_profile_invalid");
  return { slug, displayName, legalName, nationalId: nationalId || null };
}

export function rolePermissions(role: unknown, overrides: unknown = []) {
  if (!BUSINESS_ROLES.includes(role as BusinessRole)) throw new Error("business_role_invalid");
  const requested = Array.isArray(overrides) ? overrides.map(String) : [];
  if (requested.some(item => !BUSINESS_PERMISSIONS.includes(item as BusinessPermission))) throw new Error("business_permission_invalid");
  const allowed = ROLE_PERMISSIONS[role as BusinessRole];
  if (requested.some(item => !allowed.includes(item as BusinessPermission))) throw new Error("business_permission_escalation");
  return requested.length ? [...new Set(requested)] as BusinessPermission[] : [...allowed];
}

export function can(role: BusinessRole, permission: BusinessPermission, overrides?: readonly BusinessPermission[]) {
  return (overrides?.length ? overrides : ROLE_PERMISSIONS[role]).includes(permission);
}

export function createInvitationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: createHash("sha256").update(token).digest("hex") };
}

export function invitationWindow(now = new Date(), hours = 72) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime()) || !Number.isInteger(hours) || hours < 1 || hours > 168) throw new Error("business_invitation_window_invalid");
  return { issuedAt: now, expiresAt: new Date(now.getTime() + hours * 3_600_000) };
}

export function hashInvitationToken(token: unknown) {
  const value = String(token ?? "");
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(value)) throw new Error("business_invitation_token_invalid");
  return createHash("sha256").update(value).digest("hex");
}

export function storefrontSlug(value: unknown) {
  const slug = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(slug)) throw new Error("business_storefront_slug_invalid");
  return slug;
}

export function leadAttribution(input: { source?: unknown; medium?: unknown; campaign?: unknown; referrer?: unknown }) {
  const clean = (value: unknown, maximum: number) => String(value ?? "direct").trim().slice(0, maximum).replace(/[^\p{L}\p{N}._:/?&=+\- ]/gu, "");
  return { source: clean(input.source, 64), medium: clean(input.medium, 64), campaign: clean(input.campaign, 120), referrer: clean(input.referrer, 500) };
}

export function aggregateMetrics(events: Array<{ kind: "view" | "contact" | "chat" | "call"; uniqueKey: string }>) {
  const unique = new Set<string>();
  const result = { views: 0, contacts: 0, chats: 0, calls: 0, uniqueVisitors: 0, conversionBps: 0 };
  for (const event of events) { if (event.kind === "view") result.views += 1; else if (event.kind === "contact") result.contacts += 1; else if (event.kind === "chat") result.chats += 1; else result.calls += 1; unique.add(event.uniqueKey); }
  result.uniqueVisitors = unique.size;
  result.conversionBps = result.views ? Math.min(10_000, Math.floor(((result.contacts + result.chats + result.calls) * 10_000) / result.views)) : 0;
  return result;
}
