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
  center: { longitude: number; latitude: number };
  bbox?: { type: "Polygon"; coordinates: number[][][] };
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
