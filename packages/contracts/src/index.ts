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
