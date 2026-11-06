export type ServiceName = "web" | "api" | "chat";

export interface ServiceHealth {
  status: "ok" | "degraded";
  service: `haftsoo-${ServiceName}`;
  version: string;
  timestamp: string;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: { requestId: string; version: "v1" };
}

export interface ChatMessageDraft {
  conversationId: string;
  clientMessageId: string;
  body: string;
  sentAt: string;
}

export const API_VERSION = "v1" as const;
export const HEALTH_SCHEMA_VERSION = 1 as const;

export type PrincipalType = "anonymous" | "user" | "business" | "workforce" | "service";

export interface IdentityPrincipal {
  id: string;
  type: PrincipalType;
  tenantId: string;
  roles: string[];
  scopes: string[];
  sessionId?: string;
  deviceId?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  permission: string;
  reason: "role-grant" | "missing-permission" | "missing-scope" | "device-risk";
  policyVersion: "1.0.0";
}

export type AuthDeliveryMethod = "sms" | "call" | "messenger";

export interface AuthChallengeResponse {
  preAuthSessionId: string;
  maskedPhone: string;
  expiresAt: string;
  cooldownUntil: string;
  delivery: { method: AuthDeliveryMethod; provider: string };
}

export interface AuthenticatedUser { id: string; phoneNumber: string }

export interface AuthSessionToken {
  user: AuthenticatedUser;
  session: { id: string; deviceId: string; newDevice: boolean; accessExpiresAt: string };
  accessToken: string;
}

export interface ActiveSession {
  id: string;
  status: "active" | "revoked" | "expired";
  device_name: string;
  device_kind: string;
  last_ip_label: string;
  last_seen_at: string;
  current: boolean;
}

export type CatalogFieldType = "text" | "textarea" | "integer" | "decimal" | "boolean" | "single_select" | "multi_select" | "date" | "location" | "media";

export interface CatalogCategoryNode {
  key: string;
  slug: string;
  title: string;
  description: string;
  depth: number;
  icon: Record<string, unknown>;
  children: CatalogCategoryNode[];
}

export interface CatalogFormField {
  key: string;
  type: CatalogFieldType;
  title: string;
  section: string;
  position: number;
  required: boolean;
  disabled: boolean;
  validators: Record<string, unknown>;
  ui: Record<string, unknown>;
  options: Array<{ value: string; title: string; sortOrder: number }>;
}

export interface CatalogResponseMeta {
  requestId: string;
  version: "v1";
  catalogVersion: number;
}

export type GeoPlaceType = "country" | "province" | "county" | "district" | "rural_district" | "city" | "neighborhood";

export interface GeoPlace {
  key: string;
  parentKey?: string;
  type: GeoPlaceType;
  slug: string;
  name: string;
  aliases: string[];
  depth: number;
  center?: { longitude: number; latitude: number };
  bbox?: { type: "Polygon"; coordinates: number[][][] };
}

export interface GeoSelection {
  provinceKey?: string;
  cityKey?: string;
  neighborhoodKeys: string[];
}

export interface GeoHierarchyCity {
  provinceKey: string;
  provinceName: string;
  cityKey: string;
  cityName: string;
  neighborhoodCount: number;
  neighborhoods: Array<{ key: string; name: string; slug: string; hasBoundary: boolean }>;
}

export interface GeoBoundary {
  key: string;
  name: string;
  type: GeoPlaceType;
  geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
  bbox: { type: "Polygon"; coordinates: number[][][] };
}

export interface GeoResponseMeta {
  requestId: string;
  version: "v1";
  geoVersion: number;
}

export type SearchSort = "relevance" | "newest" | "price-asc" | "price-desc";

export interface SearchFilterValue {
  eq?: string | number | boolean;
  any?: Array<string | number>;
  gte?: number;
  lte?: number;
}

export interface SearchRequest {
  query?: string;
  cityIds?: string[];
  districtIds?: string[];
  categorySlug?: string;
  filters?: Record<string, SearchFilterValue>;
  sort?: SearchSort;
  cursor?: string;
  limit?: number;
}

export interface SearchHit {
  id: string;
  title: string;
  cityId: string;
  districtId?: string;
  categorySlug: string;
  price?: number;
  publishedAt: string;
  thumbnailUrl?: string;
}

export interface SearchResponse {
  items: SearchHit[];
  total: number;
  nextCursor?: string;
  facets: Record<string, Array<{ value: string; count: number }>>;
  tookMs: number;
}

export interface SearchSuggestion {
  text: string;
  categorySlug?: string;
  score: number;
}

export interface MapBoundingBox {
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
}

export interface MapCameraState {
  bbox: MapBoundingBox;
  zoom: number;
  center?: { longitude: number; latitude: number };
}

export interface MapCluster {
  id: string;
  longitude: number;
  latitude: number;
  count: number;
  destinationZoom: number;
  preview?: SearchHit;
}

export interface MapViewportResponse {
  clusters: MapCluster[];
  total: number;
  cameraHash: string;
  showSearchThisArea: boolean;
}

export type SubmissionStep = "category" | "details" | "location" | "media" | "contact" | "preview";
export type MediaStatus = "initiated" | "uploaded" | "scanning" | "processing" | "ready" | "rejected" | "failed" | "deleted";
export interface SubmissionMediaDraft { clientId: string; assetId?: string; kind: "image" | "video"; name: string; size: number; contentType: string; status: "staged" | "hashing" | "uploading" | "processing" | "ready" | "failed"; cover?: boolean }
export interface MediaUploadRequest { draftId: string; clientId: string; fileName: string; contentType: string; size: number; sha256: string; kind: "image" | "video" }
export interface MediaUploadTicket { asset: { id: string; status: MediaStatus }; upload: { url: string; headers: Record<string, string>; expiresAt: string } }
export interface MediaAsset { id: string; draftId: string; clientId: string; kind: "image" | "video"; status: MediaStatus; position: number; cover: boolean; url?: string; rejectionCode?: string }
export interface SubmissionPayload {
  category?: { key: string; slug: string; path: string[] };
  fields?: Record<string, string | number | boolean | string[]>;
  location?: { provinceKey: string; cityKey: string; neighborhoodKeys: string[]; latitude?: number; longitude?: number };
  media?: SubmissionMediaDraft[];
  description?: string;
  contact?: { phone: string; chatEnabled: boolean; phoneVisible: boolean };
  privacy?: { preciseLocationVisible: boolean };
  consents?: { terms: boolean; safeTrade: boolean };
}
export interface SubmissionDraft { id: string; status: "draft" | "ready" | "submitted"; currentStep: SubmissionStep; revision: number; payload: SubmissionPayload; updatedAt: string }
export interface SubmissionSaveRequest { revision: number; currentStep: SubmissionStep; payload: SubmissionPayload }
export interface SubmissionPreview { valid: boolean; issues: Array<{ path: string; code: string; message: string }>; checksum: string; draft: SubmissionDraft }
export interface SubmissionResult { postId: string; status: "pending_review"; replayed: boolean }

export type PostLifecycleStatus = "pending_review" | "needs_changes" | "published" | "paused" | "rejected" | "expired" | "archived" | "deleted";
export type MyPostsBucket = "active" | "drafts" | "review" | "rejected" | "expired" | "archived";
export type OwnerPostAction = "pause" | "resume" | "renew" | "republish" | "archive" | "delete";
export interface MyPostSummary { id: string; kind: "post" | "draft"; title: string; status: PostLifecycleStatus | "draft"; version: number; updatedAt: string; expiresAt?: string; moderation?: { reasonCode?: string | null; message?: string | null } }
export interface PostLifecycleActionRequest { expectedVersion: number; action: OwnerPostAction; requestId: string }
export interface PostVersionSnapshot { version: number; snapshot: Record<string, unknown>; changeKind: string; createdAt: string }

export interface PublicPostMedia { id: string; kind: "image" | "video"; url: string; position: number; cover: boolean }
export interface ApproximatePostLocation { latitude: number; longitude: number; radiusMeters: number }
export interface PublicPostDetail {
  token: string; slug: string; state: "ready" | "expired"; title: string; description: string; categorySlug: string; cityKey: string;
  neighborhoodKeys: string[]; attributes: Record<string, unknown>; media: PublicPostMedia[]; location: ApproximatePostLocation | null;
  seller: { name: string; type: string; verified: boolean; memberSince: unknown };
  contact: { canRevealPhone: boolean; chatEnabled: boolean; safeCallEnabled: boolean };
  publishedAt?: string; expiresAt?: string; canonical: string; structuredData: Record<string, unknown>;
}
export type PostReportReason = "fraud" | "duplicate" | "wrong_category" | "sold" | "prohibited" | "other";
export interface ContactRevealRequest { requestId: string }
export interface ContactRevealResult { phone: string; safeCallEnabled: boolean; replayed: boolean }

export type AccountIdentityStatus = "unverified" | "pending" | "verified" | "rejected" | "expired";
export interface AccountProfile { userId: string; phoneMasked: string; displayName: string; bio: string; avatarKey?: string | null; identityStatus: AccountIdentityStatus }
export interface AccountPreferences { theme: "system" | "light" | "dark"; language: "fa-IR"; defaultCity?: string | null; alertFrequency: "instant" | "daily" | "weekly"; marketingMessages: boolean; safetyAlerts: boolean; searchAlerts: boolean }
export interface BookmarkCollection { id: string; name: string; isDefault: boolean; itemCount: number }
export interface AccountOverview { profile: AccountProfile; preferences: AccountPreferences; summary: { posts: number; bookmarks: number; recent: number; savedSearches: number; identityVerified: boolean; completionPercent: number; actions: string[] } }
export interface ConsentRecord { purpose: "analytics" | "personalization" | "marketing"; granted: boolean; policyVersion: string; recordedAt: string }
export interface AccountDataRequest { id: string; kind: "export" | "delete"; status: "queued" | "processing" | "ready" | "pending" | "completed" | "cancelled"; executeAfter: string }

export interface ChatTicket { ticket: string; expiresAt: string; websocketPath: "/v1/chat/ws" }
export interface ChatConversation { id: string; tenantId: string; postToken: string; participantIds: string[]; lastSequence: number; lastMessageAt: string; lastReadSequence: number; unreadCount: number }
export interface ChatMessage { id: string; conversationId: string; senderId: string; clientMessageId: string; sequence: number; kind: "text"; body: string; createdAt: string }
export type ChatClientCommand =
  | { type: "send_message"; conversationId: string; clientMessageId: string; body: string }
  | { type: "seen"; conversationId: string; sequence: number }
  | { type: "typing"; conversationId: string; typing: boolean }
  | { type: "ping" };
export type ChatServerEvent =
  | { type: "connection.ready"; actorId: string; occurredAt: string }
  | { type: "conversation.created"; conversationId: string; occurredAt: string }
  | { type: "message.created"; conversationId: string; sequence: number; message: ChatMessage; occurredAt: string }
  | { type: "message.ack"; created: boolean; message: ChatMessage }
  | { type: "message.seen"; conversationId: string; sequence: number; actorId: string; occurredAt: string }
  | { type: "typing.changed"; conversationId: string; actorId: string; payload: { typing: boolean }; occurredAt: string }
  | { type: "error"; code: string; clientMessageId?: string };

export type ChatConnectionState = "idle" | "connecting" | "online" | "reconnecting" | "offline";
export type ChatDeliveryState = "pending" | "sent" | "seen" | "failed";
export type ChatInboxFilter = "all" | "unread" | "my_post" | "others_post";
export interface ChatPeerSummary { id: string; name: string; avatar?: string; online: boolean; lastSeenLabel?: string }
export interface ChatConversationSummary extends ChatConversation { title: string; thumbnail?: string; peer: ChatPeerSummary; lastMessage?: string; context: "my_post" | "others_post" }
export interface ChatQueuedCommand { command: ChatClientCommand; queuedAt: string; attempts: number }

export type NotificationCategory = "listing" | "chat" | "search" | "security" | "finance" | "marketing" | "system";
export type NotificationChannel = "in_app" | "sms" | "email" | "push";
export interface NotificationItem { id: string; category: NotificationCategory; severity: "info" | "success" | "warning" | "critical"; title: string; body: string; actionUrl?: string | null; readAt?: string | null; createdAt: string }
export interface NotificationPreference { inApp: boolean; sms: boolean; email: boolean; push: boolean; categories: Record<NotificationCategory, boolean>; quietStart: string | null; quietEnd: string | null; timezone: string }
export interface NotificationDeliveryReceipt { provider: string; messageId: string; state: "delivered" | "failed"; occurredAt: string }

export type ModerationAction = "allow" | "review" | "reject";
export type ModerationDecision = "approve" | "needs_changes" | "reject";
export interface ModerationSignal { code: string; score: number; source: "rule" | "text_model" | "vision_model" | "duplicate" | "report"; explanation: string }
export interface ModerationEvaluation { id: string; postId: string; action: ModerationAction; riskScore: number; reasonCodes: string[]; signals: ModerationSignal[]; modelVersion: string; duplicateOfPostId?: string | null }
export interface ModerationCase { id: string; postId: string; state: "open" | "claimed" | "appealed" | "resolved" | "cancelled"; priority: number; reasonCodes: string[]; evaluation: ModerationEvaluation }
export interface ModerationDecisionRequest { decision: ModerationDecision; reasonCode: string; note: string }
export interface ModerationAppealRequest { statement: string }

export type MonetizationProductKind = "bump" | "urgent" | "featured" | "storefront" | "package" | "subscription";
export interface MonetizationProduct { id: string; code: string; kind: MonetizationProductKind; title: string; description: string; audience: "personal" | "business" | "all"; durationMinutes: number; quota: number; price: { id: string; amount: number; currency: "IRR" } }
export interface MonetizationOrderRequest { priceId: string; listingId?: string; quantity: number; coupon?: string; idempotencyKey: string }
export interface MonetizationOrder { id: string; state: "pending" | "paid" | "fulfilled" | "partially_fulfilled" | "cancelled" | "refunded" | "failed"; subtotal: number; discount: number; tax: number; total: number; currency: "IRR"; paymentIntentId?: string | null }
export interface MonetizationEntitlement { id: string; product: Pick<MonetizationProduct, "code" | "kind" | "title">; granted: number; consumed: number; remaining: number; startsAt: string; expiresAt?: string | null; state: "pending" | "active" | "exhausted" | "expired" | "revoked" }
export interface ListingPromotion { id: string; listingId: string; kind: "bump" | "urgent" | "featured"; state: "scheduled" | "active" | "completed" | "cancelled" | "failed"; startsAt: string; endsAt: string }

export type BusinessVerificationState = "unverified" | "pending" | "verified" | "rejected" | "expired";
export type BusinessRole = "owner" | "admin" | "listing_manager" | "support" | "analyst" | "billing";
export interface BusinessAccount { id: string; slug: string; displayName: string; legalName: string; logoUrl?: string | null; verificationState: BusinessVerificationState; state: "active" | "suspended" | "closed"; version: number }
export interface BusinessMembership { id: string; businessId: string; userId: string; role: BusinessRole; permissions: string[]; state: "invited" | "active" | "suspended" | "revoked"; joinedAt?: string | null }
export interface BusinessInvitation { id: string; businessId: string; role: Exclude<BusinessRole, "owner">; expiresAt: string; state: "pending" | "accepted" | "revoked" | "expired" }
export interface BusinessBranch { id: string; businessId: string; cityId?: string | null; neighborhoodId?: string | null; title: string; slug: string; publicPhone?: string | null; publicAddress?: string | null; state: "active" | "inactive" | "closed" }
export interface BusinessStorefront { id: string; businessId: string; slug: string; headline: string; description: string; state: "draft" | "published" | "paused" | "archived"; branches: BusinessBranch[] }
export interface BusinessDashboard { members: number; branches: number; listings: number; leadsToday: number; views30d: number; contacts30d: number }

export type AdminRole = "platform_admin" | "platform_observer" | "security_admin";
export interface AdminExecutiveMetrics { users: number; activeListings: number; contacts: number; views: number; revenueIrr: number; openCases: number; contactRateBps: number; revenuePerListingIrr: number }
export interface AdminServiceHealth { service: string; status: "ok" | "degraded" | "down"; latencyMs: number; availabilityBps: number; version: string; checkedAt: string }
export interface AdminAlert { id: string; severity: "info" | "warning" | "critical"; source: string; title: string; description: string; state: "open" | "acknowledged" | "resolved" | "suppressed"; occurrenceCount: number; lastSeenAt: string }
export interface AdminReportJob { id: string; kind: "marketplace" | "trust" | "finance" | "operations"; format: "csv" | "json"; state: "queued" | "running" | "ready" | "failed" | "expired"; progress: number; objectKey?: string | null }
export interface AdminConfiguration { key: string; environment: "development" | "staging" | "production"; value: Record<string, unknown>; version: number; checksum: string; publishedAt: string }

export interface ProductAnalyticsEvent {
  id: string; eventName: string; schemaVersion: number; anonymousId?: string; userId?: string; sessionId: string;
  occurredAt: string; receivedAt: string; properties: Record<string, unknown>; consent: "analytics";
}
export interface AnalyticsFunnelStep { key: string; title: string; count: number; conversionBps: number }
export interface AnalyticsFunnelSnapshot { key: string; version: number; windowStart: string; windowEnd: string; steps: AnalyticsFunnelStep[] }
export interface AnalyticsCohortRow { cohort: string; size: number; retentionBps: number[] }
export interface AnalyticsExperimentVariant { key: string; title: string; weightBps: number; exposures: number; conversions: number }
export interface AnalyticsExperiment {
  id: string; key: string; title: string; state: "draft" | "pending_approval" | "running" | "paused" | "completed" | "cancelled";
  primaryMetric: string; variants: AnalyticsExperimentVariant[]; startsAt?: string | null; endsAt?: string | null;
}
