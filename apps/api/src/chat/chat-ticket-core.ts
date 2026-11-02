import { createHmac, randomBytes } from "node:crypto";

export interface ChatTicketPayload {
  v: 1;
  aud: "haftsoo-chat";
  tenantId: string;
  userId: string;
  sessionId: string;
  postToken?: string;
  iat: number;
  exp: number;
  nonce: string;
}

const POST_TOKEN = /^[A-Za-z0-9_-]{4,64}$/;

export function createChatTicket(input: { tenantId: string; userId: string; sessionId: string; postToken?: string; now?: Date; ttlSeconds?: number }, signingKey: string) {
  if (signingKey.length < 32) throw new Error("chat_signing_key_invalid");
  if (input.postToken && !POST_TOKEN.test(input.postToken)) throw new Error("post_token_invalid");
  const now = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const ttl = Math.min(Math.max(input.ttlSeconds ?? 60, 15), 120);
  const payload: ChatTicketPayload = {
    v: 1,
    aud: "haftsoo-chat",
    tenantId: input.tenantId,
    userId: input.userId,
    sessionId: input.sessionId,
    ...(input.postToken ? { postToken: input.postToken } : {}),
    iat: now,
    exp: now + ttl,
    nonce: randomBytes(16).toString("base64url")
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", signingKey).update(encoded).digest("base64url");
  return { ticket: `${encoded}.${signature}`, expiresAt: new Date(payload.exp * 1000).toISOString(), payload };
}
