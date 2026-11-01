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
