import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("chat UI supports inbox, websocket, optimistic send and safety", () => {
  const chat = readFileSync(new URL("../composables/useChat.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../pages/chat/[[conversation]].vue", import.meta.url), "utf8");
  const inbox = readFileSync(new URL("../components/ChatInbox.vue", import.meta.url), "utf8");
  assert.match(chat, /new WebSocket/);
  assert.match(chat, /clientMessageId/);
  assert.match(chat, /haftsoo-chat-queue/);
  assert.match(chat, /scheduleReconnect/);
  assert.match(chat, /typing/);
  assert.match(page, /ChatSafetyDialog/);
  assert.match(page, /ChatMessageBubble/);
  assert.match(inbox, /خوانده‌نشده/);
});
