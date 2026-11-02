import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { createChatTicket } from "../dist/chat/chat-ticket-core.js";

test("chat tickets are short lived, scoped and signed", () => {
  const key = "stage-20-chat-ticket-signing-key-material";
  const now = new Date("2026-11-02T12:00:00.000Z");
  const result = createChatTicket({ tenantId: "tenant-1", userId: "user-1", sessionId: "session-1", postToken: "hs-a91m2", now }, key);
  const [encoded, signature] = result.ticket.split(".");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  assert.equal(signature, createHmac("sha256", key).update(encoded).digest("base64url"));
  assert.equal(payload.aud, "haftsoo-chat");
  assert.equal(payload.exp - payload.iat, 60);
  assert.equal(payload.postToken, "hs-a91m2");
});

test("chat ticket input fails closed", () => {
  assert.throws(() => createChatTicket({ tenantId: "t", userId: "u", sessionId: "s", postToken: "!" }, "stage-20-chat-ticket-signing-key-material"), /post_token_invalid/);
  assert.throws(() => createChatTicket({ tenantId: "t", userId: "u", sessionId: "s" }, "short"), /chat_signing_key_invalid/);
});
